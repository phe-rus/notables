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
    // Write beside the target and rename, so a crash never leaves half a file.
    std::fs::write(path(media_dir, id)?.with_extension("part"), bytes)?;
    commit(connection, media_dir, id, mime_type)
}

/// Writes one piece of a file being saved in pieces, at `offset`. The first
/// piece (offset 0) starts the file afresh. Android's WebView can only send
/// binary bodies as JSON number arrays, so large files cross in pieces.
pub fn write_part(media_dir: &Path, id: &str, offset: u64, bytes: &[u8]) -> Result<()> {
    use std::io::{Seek, SeekFrom, Write};
    let partial = path(media_dir, id)?.with_extension("part");
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(offset == 0)
        .open(partial)?;
    file.seek(SeekFrom::Start(offset))?;
    file.write_all(bytes)?;
    Ok(())
}

/// Moves a fully written `.part` file into place and indexes it.
pub fn commit(connection: &Connection, media_dir: &Path, id: &str, mime_type: &str) -> Result<()> {
    let file = path(media_dir, id)?;
    let partial = file.with_extension("part");
    let size = std::fs::metadata(&partial)?.len();
    std::fs::rename(&partial, &file)?;
    connection.execute(
        "INSERT INTO media (id, mime_type, size_bytes, created_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (id) DO UPDATE SET mime_type = excluded.mime_type,
                                        size_bytes = excluded.size_bytes",
        params![id, mime_type, size as i64, now_ms()],
    )?;
    Ok(())
}

/// A stored file's id and type.
#[derive(Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaEntry {
    pub id: String,
    pub mime_type: String,
}

/// Every stored file, with its type.
pub fn list(connection: &Connection) -> Result<Vec<MediaEntry>> {
    let mut statement = connection.prepare_cached("SELECT id, mime_type FROM media ORDER BY id")?;
    let entries = statement
        .query_map([], |row| {
            Ok(MediaEntry {
                id: row.get(0)?,
                mime_type: row.get(1)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(entries)
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

    #[test]
    fn lists_stored_files() {
        let connection = open_in_memory().unwrap();
        let dir = std::env::temp_dir().join(format!("notables-media-list-{}", now_ms()));
        std::fs::create_dir_all(&dir).unwrap();
        save(&connection, &dir, "b-2", "image/png", b"x").unwrap();
        save(&connection, &dir, "a-1", "audio/mp4", b"y").unwrap();
        let ids: Vec<_> = list(&connection)
            .unwrap()
            .into_iter()
            .map(|entry| entry.id)
            .collect();
        assert_eq!(ids, vec!["a-1", "b-2"]);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn saves_a_file_sent_in_pieces() {
        let connection = open_in_memory().unwrap();
        let dir = std::env::temp_dir().join(format!("notables-media-parts-{}", now_ms()));
        std::fs::create_dir_all(&dir).unwrap();

        // A stale piece from an interrupted save is replaced by a new first piece.
        write_part(&dir, "book-1", 0, b"stale and longer").unwrap();
        write_part(&dir, "book-1", 0, b"chap").unwrap();
        write_part(&dir, "book-1", 4, b"ter").unwrap();
        assert!(find(&connection, &dir, "book-1").unwrap().is_none());

        commit(&connection, &dir, "book-1", "audio/mpeg").unwrap();
        let (file, mime) = find(&connection, &dir, "book-1").unwrap().unwrap();
        assert_eq!(mime, "audio/mpeg");
        assert_eq!(std::fs::read(&file).unwrap(), b"chapter");
        assert!(!file.with_extension("part").exists());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
