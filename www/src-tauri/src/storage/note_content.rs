//! The latest rendered document of each note (Lexical JSON), so books and
//! previews can show a note without opening its editor.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension, params};

use super::error::Result;

pub fn save(connection: &Connection, note_id: &str, document: &str) -> Result<()> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_millis() as i64);
    connection
        .prepare_cached(
            "INSERT INTO note_content (note_id, document, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT (note_id) DO UPDATE SET document = excluded.document,
                                                 updated_at = excluded.updated_at",
        )?
        .execute(params![note_id, document, now])?;
    Ok(())
}

pub fn load(connection: &Connection, note_id: &str) -> Result<Option<String>> {
    Ok(connection
        .query_row(
            "SELECT document FROM note_content WHERE note_id = ?1",
            [note_id],
            |row| row.get(0),
        )
        .optional()?)
}

pub fn remove(connection: &Connection, note_id: &str) -> Result<()> {
    connection.execute("DELETE FROM note_content WHERE note_id = ?1", [note_id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::database::open_in_memory;

    #[test]
    fn keeps_the_latest_document() {
        let connection = open_in_memory().unwrap();
        save(&connection, "n1", r#"{"root":1}"#).unwrap();
        save(&connection, "n1", r#"{"root":2}"#).unwrap();
        assert_eq!(
            load(&connection, "n1").unwrap().as_deref(),
            Some(r#"{"root":2}"#)
        );
        remove(&connection, "n1").unwrap();
        assert_eq!(load(&connection, "n1").unwrap(), None);
    }
}
