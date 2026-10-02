//! Photos and recordings: one file per item in the media folder, indexed in
//! SQLite with its type. Ids come from the WebView, so they are checked
//! before they touch a path.

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension, params};

use super::error::{Result, StorageError};

/// Ids are UUIDs; allow only their characters so an id can't escape the folder.
pub fn checked_id(id: &str) -> Result<&str> {
    let valid = !id.is_empty()
        && id.len() <= 64
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-');
    if valid {
        Ok(id)
    } else {
        Err(StorageError::InvalidId)
    }
}

pub fn path(media_dir: &Path, id: &str) -> Result<PathBuf> {
    Ok(media_dir.join(checked_id(id)?))
}

pub fn save(
    connection: &Connection,
    media_dir: &Path,
    id: &str,
    mime_type: &str,
    bytes: &[u8],
) -> Result<()> {
    let file = path(media_dir, id)?;
    // Write beside the target and rename, so a crash never leaves half a file.
    let partial = file.with_extension("part");
    std::fs::write(&partial, bytes)?;
    std::fs::rename(&partial, &file)?;
    connection.execute(
        "INSERT INTO media (id, mime_type, size_bytes, created_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (id) DO UPDATE SET mime_type = excluded.mime_type,
                                        size_bytes = excluded.size_bytes",
        params![id, mime_type, bytes.len() as i64, now_ms()],
    )?;
    Ok(())
}

/// The stored file's path and type, if it exists.
pub fn find(
    connection: &Connection,
    media_dir: &Path,
    id: &str,
) -> Result<Option<(PathBuf, String)>> {
    let file = path(media_dir, id)?;
    let mime_type: Option<String> = connection
        .query_row("SELECT mime_type FROM media WHERE id = ?1", [id], |row| {
            row.get(0)
        })
        .optional()?;
    Ok(mime_type.filter(|_| file.exists()).map(|mime| (file, mime)))
}

pub fn remove(connection: &Connection, media_dir: &Path, id: &str) -> Result<()> {
    let file = path(media_dir, id)?;
    connection.execute("DELETE FROM media WHERE id = ?1", [id])?;
    match std::fs::remove_file(file) {
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(error.into()),
        _ => Ok(()),
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_millis() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::database::open_in_memory;

    #[test]
    fn rejects_ids_that_could_escape_the_folder() {
        assert!(checked_id("0199a6c2-7b1e-7cc0-9d1b-3f2a5e6b7c8d").is_ok());
        for id in ["", "../notables.sqlite3", "a/b", "a\\b", "a.b"] {
            assert!(checked_id(id).is_err(), "{id} should be rejected");
        }
    }

    #[test]
    fn saves_finds_and_removes_files() {
        let connection = open_in_memory().unwrap();
        let dir = std::env::temp_dir().join(format!("notables-media-test-{}", now_ms()));
        std::fs::create_dir_all(&dir).unwrap();

        save(&connection, &dir, "clip-1", "audio/mp4", b"bytes").unwrap();
        let (file, mime) = find(&connection, &dir, "clip-1").unwrap().unwrap();
        assert_eq!(mime, "audio/mp4");
        assert_eq!(std::fs::read(&file).unwrap(), b"bytes");

        remove(&connection, &dir, "clip-1").unwrap();
        assert!(find(&connection, &dir, "clip-1").unwrap().is_none());
        remove(&connection, &dir, "clip-1").unwrap();
        std::fs::remove_dir_all(dir).unwrap();
    }
}
