use std::path::Path;

use rusqlite::{Connection, OptionalExtension, params};

use super::error::Result;

/// Schema changes, applied in order. Never edit one that has shipped.
const MIGRATIONS: &[&str] = &[
    // 1: documents, note content, media index and metadata.
    "CREATE TABLE document_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document TEXT NOT NULL,
        data BLOB NOT NULL
     );
     CREATE INDEX document_updates_by_document ON document_updates (document, id);
     CREATE TABLE note_content (
        note_id TEXT PRIMARY KEY,
        document TEXT NOT NULL,
        updated_at INTEGER NOT NULL
     );
     CREATE TABLE media (
        id TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at INTEGER NOT NULL
     );
     CREATE TABLE meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
     );",
];

pub fn open(path: &Path) -> Result<Connection> {
    let connection = Connection::open(path)?;
    configure(&connection)?;
    migrate(&connection)?;
    Ok(connection)
}

#[cfg(test)]
pub fn open_in_memory() -> Result<Connection> {
    let connection = Connection::open_in_memory()?;
    configure(&connection)?;
    migrate(&connection)?;
    Ok(connection)
}

fn configure(connection: &Connection) -> Result<()> {
    // WAL keeps writes cheap while typing; NORMAL sync is durable across app crashes.
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "synchronous", "NORMAL")?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    Ok(())
}

fn migrate(connection: &Connection) -> Result<()> {
    let applied: i64 = connection.pragma_query_value(None, "user_version", |row| row.get(0))?;
    for (version, migration) in (1_i64..).zip(MIGRATIONS).skip(applied as usize) {
        let transaction = connection.unchecked_transaction()?;
        transaction.execute_batch(migration)?;
        transaction.pragma_update(None, "user_version", version)?;
        transaction.commit()?;
    }
    Ok(())
}

pub fn meta(connection: &Connection, key: &str) -> Result<Option<String>> {
    Ok(connection
        .query_row("SELECT value FROM meta WHERE key = ?1", [key], |row| {
            row.get(0)
        })
        .optional()?)
}

pub fn set_meta(connection: &Connection, key: &str, value: &str) -> Result<()> {
    connection.execute(
        "INSERT INTO meta (key, value) VALUES (?1, ?2)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_once() {
        let connection = open_in_memory().unwrap();
        migrate(&connection).unwrap();
        let version: i64 = connection
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .unwrap();
        assert_eq!(version, MIGRATIONS.len() as i64);
    }

    #[test]
    fn stores_metadata() {
        let connection = open_in_memory().unwrap();
        assert_eq!(meta(&connection, "k").unwrap(), None);
        set_meta(&connection, "k", "1").unwrap();
        set_meta(&connection, "k", "2").unwrap();
        assert_eq!(meta(&connection, "k").unwrap().as_deref(), Some("2"));
    }
}
