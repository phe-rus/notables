use rusqlite::{Transaction, params};
use uuid::Uuid;
use zeroize::Zeroizing;

use super::super::{
    crypto::{self, DataKey, Envelope},
    error::{Result, WalletError},
};
use super::{AuditEvent, Header, context, read_error, write_error};

pub(super) fn audit(
    transaction: &Transaction<'_>,
    header: &Header,
    key: &DataKey,
    event: &AuditEvent,
) -> Result<()> {
    if !["save", "delete", "unlock", "prototype-migration"].contains(&event.action.as_str())
        || !["success", "failure"].contains(&event.outcome.as_str())
    {
        return Err(WalletError::InvalidInput);
    }
    let id = Uuid::new_v4().to_string();
    let plaintext =
        Zeroizing::new(serde_json::to_vec(event).map_err(|_| WalletError::InvalidInput)?);
    let envelope = crypto::seal(key, &plaintext, &context(header.wallet_id, "audit", &id, 1))?;
    transaction
        .execute(
            "INSERT INTO wallet_records VALUES (?1, 'audit', 1, ?2, ?3)",
            params![id, envelope.nonce.as_slice(), envelope.ciphertext],
        )
        .map_err(write_error)?;
    transaction
        .execute(
            "DELETE FROM wallet_records WHERE category = 'audit' AND rowid NOT IN
        (SELECT rowid FROM wallet_records WHERE category = 'audit' ORDER BY rowid DESC LIMIT 1000)",
            [],
        )
        .map_err(write_error)?;
    let cutoff = event.time.saturating_sub(30 * 24 * 60 * 60 * 1000);
    let rows = {
        let mut statement = transaction
            .prepare("SELECT id, nonce, ciphertext FROM wallet_records WHERE category = 'audit'")
            .map_err(read_error)?;
        statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Vec<u8>>(1)?,
                    row.get::<_, Vec<u8>>(2)?,
                ))
            })
            .map_err(read_error)?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(read_error)?
    };
    for (id, nonce, ciphertext) in rows {
        let envelope = Envelope {
            nonce: nonce.try_into().map_err(|_| WalletError::CorruptVault)?,
            ciphertext,
        };
        let plaintext =
            crypto::unseal(key, &envelope, &context(header.wallet_id, "audit", &id, 1))?;
        let old: AuditEvent =
            serde_json::from_slice(&plaintext).map_err(|_| WalletError::CorruptVault)?;
        if old.time < cutoff {
            transaction
                .execute("DELETE FROM wallet_records WHERE id = ?1", [&id])
                .map_err(write_error)?;
        }
    }
    Ok(())
}
