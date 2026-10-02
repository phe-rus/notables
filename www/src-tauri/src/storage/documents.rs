//! Yjs documents as append-only logs of binary updates. The WebView merges
//! them; it periodically replaces a long log with one compacted state.

use rusqlite::{Connection, params};

use super::error::Result;

/// All stored updates for a document, oldest first.
pub fn load(connection: &Connection, document: &str) -> Result<Vec<Vec<u8>>> {
    let mut statement = connection
        .prepare_cached("SELECT data FROM document_updates WHERE document = ?1 ORDER BY id")?;
    let rows = statement.query_map([document], |row| row.get(0))?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn append(connection: &Connection, document: &str, update: &[u8]) -> Result<()> {
    connection
        .prepare_cached("INSERT INTO document_updates (document, data) VALUES (?1, ?2)")?
        .execute(params![document, update])?;
    Ok(())
}

/// Replaces the log with a single state, atomically.
pub fn replace(connection: &Connection, document: &str, state: &[u8]) -> Result<()> {
    let transaction = connection.unchecked_transaction()?;
    transaction.execute(
        "DELETE FROM document_updates WHERE document = ?1",
        [document],
    )?;
    append(&transaction, document, state)?;
    transaction.commit()?;
    Ok(())
}

pub fn remove(connection: &Connection, document: &str) -> Result<()> {
    connection.execute(
        "DELETE FROM document_updates WHERE document = ?1",
        [document],
    )?;
    Ok(())
}

/// Frames updates as `[u32 little-endian length][bytes]…` for one IPC reply.
pub fn frame(updates: &[Vec<u8>]) -> Vec<u8> {
    let size = updates.iter().map(|update| 4 + update.len()).sum();
    let mut framed = Vec::with_capacity(size);
    for update in updates {
        framed.extend_from_slice(&(update.len() as u32).to_le_bytes());
        framed.extend_from_slice(update);
    }
    framed
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::database::open_in_memory;

    #[test]
    fn appends_replaces_and_removes() {
        let connection = open_in_memory().unwrap();
        append(&connection, "note:a", &[1]).unwrap();
        append(&connection, "note:a", &[2, 3]).unwrap();
        append(&connection, "note:b", &[9]).unwrap();
        assert_eq!(
            load(&connection, "note:a").unwrap(),
            vec![vec![1], vec![2, 3]]
        );

        replace(&connection, "note:a", &[4]).unwrap();
        assert_eq!(load(&connection, "note:a").unwrap(), vec![vec![4]]);

        remove(&connection, "note:a").unwrap();
        assert!(load(&connection, "note:a").unwrap().is_empty());
        assert_eq!(load(&connection, "note:b").unwrap(), vec![vec![9]]);
    }

    #[test]
    fn frames_with_length_prefixes() {
        assert_eq!(
            frame(&[vec![7], vec![8, 9]]),
            vec![1, 0, 0, 0, 7, 2, 0, 0, 0, 8, 9]
        );
    }
}
