use std::path::Path;

use rusqlite::{Connection, OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;
use zeroize::Zeroizing;

use super::{
    crypto::{self, DataKey, Envelope, PasswordWrapper},
    error::{Result, WalletError},
};

const CONTENT_LIMIT: i64 = 32 * 1024 * 1024;
const RECORD_LIMIT: usize = 4 * 1024 * 1024;
const SCHEMA: &str = "
CREATE TABLE wallet_header (
 singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
 format_version INTEGER NOT NULL, wallet_id TEXT NOT NULL,
 revision INTEGER NOT NULL, protection_mode TEXT NOT NULL,
 wrappers_json TEXT NOT NULL, key_generation INTEGER NOT NULL,
 transition_phase TEXT NOT NULL
);
CREATE TABLE wallet_records (
 id TEXT PRIMARY KEY, category TEXT NOT NULL, revision INTEGER NOT NULL,
 nonce BLOB NOT NULL CHECK (length(nonce) = 24), ciphertext BLOB NOT NULL
);
CREATE TABLE wallet_operations (
 operation_id TEXT PRIMARY KEY, result_ciphertext BLOB NOT NULL
);
PRAGMA user_version = 1;
";

#[derive(Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "kebab-case", deny_unknown_fields)]
pub enum KeyPolicy {
    Device { key_reference: String },
    Password { wrapper: PasswordWrapper },
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Header {
    pub format_version: u32,
    pub wallet_id: Uuid,
    pub revision: i64,
    pub key_generation: i64,
    pub policy: KeyPolicy,
}

#[derive(Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Category {
    Card,
    Template,
    Original,
}

impl Category {
    fn name(self) -> &'static str {
        match self {
            Self::Card => "card",
            Self::Template => "template",
            Self::Original => "original",
        }
    }
}

#[derive(Serialize)]
pub struct Mutation<'a> {
    pub operation_id: Uuid,
    pub id: Uuid,
    pub category: Category,
    pub expected_revision: Option<i64>,
    /// A validated aggregate, serialized before entering the storage layer.
    /// None deletes an existing aggregate.
    pub payload: Option<&'a [u8]>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Receipt {
    pub record_revision: i64,
    pub vault_revision: i64,
    pub deleted: bool,
}

#[derive(Serialize, Deserialize)]
struct StoredReceipt {
    fingerprint: Vec<u8>,
    result: Receipt,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuditEvent {
    pub action: String,
    pub time: u64,
    pub outcome: String,
    pub operation_id: Uuid,
}

fn audit(
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

/// The native session owns this object under one write lock. Drop it on lock.
/// Opening requires a key already obtained through the native access policy.
pub struct Vault {
    connection: Connection,
    key: DataKey,
    header: Header,
}

pub type DecryptedRecord = (Uuid, i64, Zeroizing<Vec<u8>>);

fn write_error(_: rusqlite::Error) -> WalletError {
    WalletError::WriteFailure
}

fn read_error(_: rusqlite::Error) -> WalletError {
    WalletError::CorruptVault
}

fn context(wallet: Uuid, category: &str, id: &str, revision: i64) -> Vec<u8> {
    format!(
        "notables:wallet:{}:{wallet}:{category}:{id}:{revision}",
        crypto::FORMAT_VERSION
    )
    .into_bytes()
}

fn configure(connection: &Connection) -> Result<()> {
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(write_error)?;
    connection
        .pragma_update(None, "synchronous", "FULL")
        .map_err(write_error)?;
    Ok(())
}

fn policy_name(policy: &KeyPolicy) -> &'static str {
    match policy {
        KeyPolicy::Device { .. } => "device",
        KeyPolicy::Password { .. } => "password",
    }
}

fn write_header(transaction: &Transaction<'_>, header: &Header, key: &DataKey) -> Result<()> {
    let policy = serde_json::to_string(&header.policy).map_err(|_| WalletError::InvalidInput)?;
    transaction
        .execute(
            "INSERT INTO wallet_header VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, 'committed')
         ON CONFLICT(singleton) DO UPDATE SET revision = excluded.revision,
         protection_mode = excluded.protection_mode, wrappers_json = excluded.wrappers_json,
         key_generation = excluded.key_generation",
            params![
                header.format_version,
                header.wallet_id.to_string(),
                header.revision,
                policy_name(&header.policy),
                policy,
                header.key_generation
            ],
        )
        .map_err(write_error)?;
    let plaintext =
        Zeroizing::new(serde_json::to_vec(header).map_err(|_| WalletError::InvalidInput)?);
    let envelope = crypto::seal(
        key,
        &plaintext,
        &context(header.wallet_id, "metadata", "policy", header.revision),
    )?;
    transaction
        .execute(
            "INSERT INTO wallet_records VALUES ('policy', 'metadata', ?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET revision = excluded.revision,
         nonce = excluded.nonce, ciphertext = excluded.ciphertext",
            params![
                header.revision,
                envelope.nonce.as_slice(),
                envelope.ciphertext
            ],
        )
        .map_err(write_error)?;
    Ok(())
}

impl Vault {
    pub fn record_audits(
        &mut self,
        events: &[AuditEvent],
        check_session: impl Fn() -> Result<()>,
    ) -> Result<()> {
        if events.len() > 1001 {
            return Err(WalletError::Quota);
        }
        let revision = self
            .header
            .revision
            .checked_add(1)
            .ok_or(WalletError::Quota)?;
        let transaction = self
            .connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(write_error)?;
        let committed: i64 = transaction
            .query_row(
                "SELECT revision FROM wallet_header WHERE singleton = 1",
                [],
                |r| r.get(0),
            )
            .map_err(read_error)?;
        if committed != self.header.revision {
            return Err(WalletError::Conflict);
        }
        for event in events {
            audit(&transaction, &self.header, &self.key, event)?;
        }
        let previous = self.header.revision;
        self.header.revision = revision;
        let result = (|| {
            write_header(&transaction, &self.header, &self.key)?;
            let bytes: i64 = transaction
                .query_row(
                    "SELECT
                (SELECT coalesce(sum(length(ciphertext) + length(nonce)), 0) FROM wallet_records) +
                (SELECT coalesce(sum(length(result_ciphertext)), 0) FROM wallet_operations)",
                    [],
                    |r| r.get(0),
                )
                .map_err(read_error)?;
            if bytes > CONTENT_LIMIT {
                return Err(WalletError::Quota);
            }
            check_session()?;
            transaction.commit().map_err(write_error)
        })();
        if result.is_err() {
            self.header.revision = previous;
        }
        result
    }
    pub fn inspect(path: &Path) -> Result<Header> {
        let connection =
            Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
                .map_err(read_error)?;
        Self::read_header(&connection)
    }

    pub fn protected(&self) -> bool {
        matches!(self.header.policy, KeyPolicy::Password { .. })
    }

    pub fn records(&self, category: Category) -> Result<Vec<DecryptedRecord>> {
        let ids: Vec<String> = {
            let mut statement = self
                .connection
                .prepare("SELECT id FROM wallet_records WHERE category = ?1 ORDER BY id LIMIT 1001")
                .map_err(read_error)?;
            statement
                .query_map([category.name()], |r| r.get(0))
                .map_err(read_error)?
                .collect::<std::result::Result<Vec<_>, _>>()
                .map_err(read_error)?
        };
        if ids.len() > 1000 {
            return Err(WalletError::CorruptVault);
        }
        ids.into_iter()
            .map(|id| {
                let id = Uuid::parse_str(&id).map_err(|_| WalletError::CorruptVault)?;
                let (revision, plaintext) = self.read(id, category)?;
                Ok((id, revision, plaintext))
            })
            .collect()
    }
    /// The caller stages and verifies the OS or password wrapper before creation.
    /// This function never creates or writes a plain key file.
    pub fn create(path: &Path, key: DataKey, policy: KeyPolicy) -> Result<Self> {
        // Exclusive creation prevents overwriting an existing or corrupt vault.
        let mut options = std::fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let file = options.open(path).map_err(|_| WalletError::WriteFailure)?;
        drop(file);
        let connection = Connection::open(path).map_err(write_error)?;
        Self::initialize(connection, key, policy)
    }

    fn initialize(mut connection: Connection, key: DataKey, policy: KeyPolicy) -> Result<Self> {
        if let KeyPolicy::Device { key_reference } = &policy
            && (key_reference.is_empty() || key_reference.len() > 256)
        {
            return Err(WalletError::InvalidInput);
        }
        configure(&connection)?;
        let header = Header {
            format_version: crypto::FORMAT_VERSION,
            wallet_id: Uuid::new_v4(),
            revision: 0,
            key_generation: 1,
            policy,
        };
        let transaction = connection.transaction().map_err(write_error)?;
        transaction.execute_batch(SCHEMA).map_err(write_error)?;
        write_header(&transaction, &header, &key)?;
        transaction.commit().map_err(write_error)?;
        Ok(Self {
            connection,
            key,
            header,
        })
    }

    pub fn open(path: &Path, key: DataKey) -> Result<Self> {
        let connection =
            Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE)
                .map_err(read_error)?;
        let header = Self::read_header(&connection)?;
        // Authenticate before changing SQLite configuration or writing anything.
        let vault = Self {
            connection,
            key,
            header,
        };
        vault.authenticate_header()?;
        configure(&vault.connection)?;
        Ok(vault)
    }

    fn read_header(connection: &Connection) -> Result<Header> {
        let version: u32 = connection
            .pragma_query_value(None, "user_version", |r| r.get(0))
            .map_err(read_error)?;
        if version != crypto::FORMAT_VERSION {
            return Err(WalletError::UnsupportedFormat);
        }
        let (format, id, revision, mode, policy, generation, phase): (
            u32,
            String,
            i64,
            String,
            String,
            i64,
            String,
        ) = connection
            .query_row(
                "SELECT format_version, wallet_id, revision, protection_mode, wrappers_json,
             key_generation, transition_phase FROM wallet_header WHERE singleton = 1",
                [],
                |r| {
                    Ok((
                        r.get(0)?,
                        r.get(1)?,
                        r.get(2)?,
                        r.get(3)?,
                        r.get(4)?,
                        r.get(5)?,
                        r.get(6)?,
                    ))
                },
            )
            .map_err(read_error)?;
        if format != crypto::FORMAT_VERSION {
            return Err(WalletError::UnsupportedFormat);
        }
        let policy: KeyPolicy =
            serde_json::from_str(&policy).map_err(|_| WalletError::CorruptVault)?;
        if mode != policy_name(&policy) || phase != "committed" || generation <= 0 || revision < 0 {
            return Err(WalletError::CorruptVault);
        }
        Ok(Header {
            format_version: format,
            wallet_id: Uuid::parse_str(&id).map_err(|_| WalletError::CorruptVault)?,
            revision,
            key_generation: generation,
            policy,
        })
    }

    fn authenticate_header(&self) -> Result<()> {
        let (revision, envelope) = self.encrypted_record("policy", "metadata")?;
        let plaintext = crypto::unseal(
            &self.key,
            &envelope,
            &context(self.header.wallet_id, "metadata", "policy", revision),
        )?;
        let expected = Zeroizing::new(
            serde_json::to_vec(&self.header).map_err(|_| WalletError::CorruptVault)?,
        );
        if plaintext.as_slice() != expected.as_slice() || revision != self.header.revision {
            return Err(WalletError::CorruptVault);
        }
        Ok(())
    }

    fn encrypted_record(&self, id: &str, category: &str) -> Result<(i64, Envelope)> {
        self.connection.query_row(
            "SELECT revision, nonce, ciphertext FROM wallet_records WHERE id = ?1 AND category = ?2",
            params![id, category], |r| {
                let nonce: Vec<u8> = r.get(1)?;
                let nonce: [u8; 24] = nonce.try_into().map_err(|_| rusqlite::Error::InvalidQuery)?;
                Ok((r.get(0)?, Envelope { nonce, ciphertext: r.get(2)? }))
            },
        ).optional().map_err(read_error)?.ok_or(WalletError::Missing)
    }

    pub fn read(&self, id: Uuid, category: Category) -> Result<(i64, Zeroizing<Vec<u8>>)> {
        let id = id.to_string();
        let (revision, envelope) = self.encrypted_record(&id, category.name())?;
        let plaintext = crypto::unseal(
            &self.key,
            &envelope,
            &context(self.header.wallet_id, category.name(), &id, revision),
        )?;
        Ok((revision, plaintext))
    }

    /// Retire prototype keys without changing card IDs, values or revisions.
    /// The caller has already authenticated access to the old vault.
    pub fn migrate_prototype_to_device(
        &mut self,
        keys: &dyn super::keys::KeyStore,
        check_session: impl Fn() -> Result<()>,
    ) -> Result<()> {
        if !cfg!(debug_assertions) {
            return Err(WalletError::InvalidOperation);
        }
        let revision = self
            .header
            .revision
            .checked_add(1)
            .ok_or(WalletError::Quota)?;
        let generation = self
            .header
            .key_generation
            .checked_add(1)
            .ok_or(WalletError::Quota)?;
        let reference = format!(
            "wallet-{}-g{}-{}",
            self.header.wallet_id,
            generation,
            Uuid::new_v4()
        );
        let next_key = crypto::random_key()?;
        let obsolete = match &self.header.policy {
            KeyPolicy::Device { key_reference } => Some(key_reference.clone()),
            _ => None,
        };
        if let Err(error) = keys.write(&reference, &next_key) {
            let _ = keys.remove(&reference);
            return Err(error);
        }
        let next = Header {
            format_version: self.header.format_version,
            wallet_id: self.header.wallet_id,
            revision,
            key_generation: generation,
            policy: KeyPolicy::Device {
                key_reference: reference.clone(),
            },
        };
        let transition = (|| {
            if *keys.read(&reference)? != *next_key {
                return Err(WalletError::SecureStoreUnavailable);
            }
            check_session()?;
            let transaction = self
                .connection
                .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
                .map_err(write_error)?;
            let revision: i64 = transaction
                .query_row(
                    "SELECT revision FROM wallet_header WHERE singleton = 1",
                    [],
                    |row| row.get(0),
                )
                .map_err(read_error)?;
            if revision != self.header.revision {
                return Err(WalletError::Conflict);
            }
            // Rotate every content and audit envelope, then the retry receipts.
            // Plaintext lives in one zeroizing buffer at a time, inside the same
            // transaction as the new authenticated policy.
            {
                let mut statement = transaction.prepare(
                    "SELECT id, category, revision, nonce, ciphertext FROM wallet_records WHERE id != 'policy'")
                    .map_err(read_error)?;
                let records = statement
                    .query_map([], |row| {
                        let nonce: Vec<u8> = row.get(3)?;
                        let nonce = nonce
                            .try_into()
                            .map_err(|_| rusqlite::Error::InvalidQuery)?;
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, i64>(2)?,
                            Envelope {
                                nonce,
                                ciphertext: row.get(4)?,
                            },
                        ))
                    })
                    .map_err(read_error)?;
                for record in records {
                    let (id, category, revision, envelope) = record.map_err(read_error)?;
                    let aad = context(next.wallet_id, &category, &id, revision);
                    let plaintext = crypto::unseal(&self.key, &envelope, &aad)?;
                    let sealed = crypto::seal(&next_key, &plaintext, &aad)?;
                    transaction
                        .execute(
                            "UPDATE wallet_records SET nonce = ?1, ciphertext = ?2 WHERE id = ?3",
                            params![sealed.nonce.as_slice(), sealed.ciphertext, id],
                        )
                        .map_err(write_error)?;
                    check_session()?;
                }
            }
            {
                let mut statement = transaction
                    .prepare("SELECT operation_id, result_ciphertext FROM wallet_operations")
                    .map_err(read_error)?;
                let operations = statement
                    .query_map([], |row| {
                        Ok((row.get::<_, String>(0)?, row.get::<_, Vec<u8>>(1)?))
                    })
                    .map_err(read_error)?;
                for operation in operations {
                    let (id, bytes) = operation.map_err(read_error)?;
                    let envelope: Envelope =
                        serde_json::from_slice(&bytes).map_err(|_| WalletError::CorruptVault)?;
                    let aad = context(next.wallet_id, "operation", &id, 1);
                    let plaintext = crypto::unseal(&self.key, &envelope, &aad)?;
                    let sealed = crypto::seal(&next_key, &plaintext, &aad)?;
                    let bytes =
                        serde_json::to_vec(&sealed).map_err(|_| WalletError::WriteFailure)?;
                    transaction.execute("UPDATE wallet_operations SET result_ciphertext = ?1 WHERE operation_id = ?2",
                        params![bytes, id]).map_err(write_error)?;
                    check_session()?;
                }
            }
            write_header(&transaction, &next, &next_key)?;

            audit(
                &transaction,
                &next,
                &next_key,
                &AuditEvent {
                    action: "prototype-migration".into(),
                    time: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map_err(|_| WalletError::Unavailable)?
                        .as_millis()
                        .try_into()
                        .map_err(|_| WalletError::Unavailable)?,
                    outcome: "success".into(),
                    operation_id: Uuid::new_v4(),
                },
            )?;
            check_session()?;
            transaction.commit().map_err(write_error)
        })();
        if let Err(error) = transition {
            // If commit status cannot be read, retain the staged key. Never
            // delete a wrapper that a committed header may already reference.
            if let Ok(header) = Self::read_header(&self.connection)
                && !matches!(header.policy, KeyPolicy::Device { key_reference } if key_reference == reference)
            {
                let _ = keys.remove(&reference);
            }
            return Err(error);
        }
        self.header = next;
        self.key = next_key;
        self.authenticate_header()?;
        if let Some(reference) = obsolete {
            let _ = keys.remove(&reference);
        }
        Ok(())
    }

    pub fn revision(&self) -> i64 {
        self.header.revision
    }

    pub fn mutate(&mut self, request: Mutation<'_>) -> Result<Receipt> {
        self.mutate_checked(request, None, None, || Ok(()))
    }

    pub fn mutate_checked(
        &mut self,
        request: Mutation<'_>,
        fingerprint_input: Option<&[u8]>,
        event: Option<&AuditEvent>,
        check_session: impl Fn() -> Result<()>,
    ) -> Result<Receipt> {
        if request
            .expected_revision
            .is_some_and(|revision| revision < 1)
        {
            return Err(WalletError::InvalidInput);
        }
        if request
            .payload
            .is_some_and(|bytes| bytes.len() > RECORD_LIMIT)
        {
            return Err(WalletError::Quota);
        }
        let canonical =
            Zeroizing::new(serde_json::to_vec(&request).map_err(|_| WalletError::InvalidInput)?);
        let fingerprint = Sha256::digest(fingerprint_input.unwrap_or(&canonical)).to_vec();
        let operation = request.operation_id.to_string();
        let receipt_context = context(self.header.wallet_id, "operation", &operation, 1);
        let transaction = self
            .connection
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(write_error)?;
        let committed_revision: i64 = transaction
            .query_row(
                "SELECT revision FROM wallet_header WHERE singleton = 1",
                [],
                |r| r.get(0),
            )
            .map_err(read_error)?;
        if committed_revision != self.header.revision {
            return Err(WalletError::Conflict);
        }
        let existing: Option<Vec<u8>> = transaction
            .query_row(
                "SELECT result_ciphertext FROM wallet_operations WHERE operation_id = ?1",
                [&operation],
                |r| r.get(0),
            )
            .optional()
            .map_err(read_error)?;
        if let Some(existing) = existing {
            let envelope: Envelope =
                serde_json::from_slice(&existing).map_err(|_| WalletError::CorruptVault)?;
            let plaintext = crypto::unseal(&self.key, &envelope, &receipt_context)?;
            let receipt: StoredReceipt =
                serde_json::from_slice(&plaintext).map_err(|_| WalletError::CorruptVault)?;
            check_session()?;
            return if receipt.fingerprint == fingerprint {
                Ok(receipt.result)
            } else {
                Err(WalletError::InvalidOperation)
            };
        }
        let id = request.id.to_string();
        let previous: Option<(i64, String)> = transaction
            .query_row(
                "SELECT revision, category FROM wallet_records WHERE id = ?1",
                [&id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .map_err(read_error)?;
        if previous.as_ref().map(|v| v.0) != request.expected_revision
            || previous
                .as_ref()
                .is_some_and(|v| v.1 != request.category.name())
        {
            return Err(WalletError::Conflict);
        }
        if request.payload.is_none() && previous.is_none() {
            return Err(WalletError::Missing);
        }
        let revision = previous.map_or(Ok(1), |v| v.0.checked_add(1).ok_or(WalletError::Quota))?;
        let next_revision = self
            .header
            .revision
            .checked_add(1)
            .ok_or(WalletError::Quota)?;
        if let Some(payload) = request.payload {
            let envelope = crypto::seal(
                &self.key,
                payload,
                &context(
                    self.header.wallet_id,
                    request.category.name(),
                    &id,
                    revision,
                ),
            )?;
            transaction
                .execute(
                    "INSERT INTO wallet_records VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(id) DO UPDATE SET revision = excluded.revision,
                 nonce = excluded.nonce, ciphertext = excluded.ciphertext",
                    params![
                        id,
                        request.category.name(),
                        revision,
                        envelope.nonce.as_slice(),
                        envelope.ciphertext
                    ],
                )
                .map_err(write_error)?;
        } else {
            transaction
                .execute("DELETE FROM wallet_records WHERE id = ?1", [&id])
                .map_err(write_error)?;
        }
        let cards: i64 = transaction
            .query_row(
                "SELECT count(*) FROM wallet_records WHERE category = 'card'",
                [],
                |r| r.get(0),
            )
            .map_err(read_error)?;
        let templates: i64 = transaction
            .query_row(
                "SELECT count(*) FROM wallet_records WHERE category = 'template'",
                [],
                |r| r.get(0),
            )
            .map_err(read_error)?;
        if cards > 1000 || templates > 500 {
            return Err(WalletError::Quota);
        }
        if let Some(event) = event {
            audit(&transaction, &self.header, &self.key, event)?;
        }
        let receipt = StoredReceipt {
            fingerprint,
            result: Receipt {
                record_revision: revision,
                vault_revision: next_revision,
                deleted: request.payload.is_none(),
            },
        };
        let plaintext =
            Zeroizing::new(serde_json::to_vec(&receipt).map_err(|_| WalletError::InvalidInput)?);
        let encrypted = crypto::seal(&self.key, &plaintext, &receipt_context)?;
        transaction
            .execute(
                "INSERT INTO wallet_operations VALUES (?1, ?2)",
                params![
                    operation,
                    serde_json::to_vec(&encrypted).map_err(|_| WalletError::InvalidInput)?
                ],
            )
            .map_err(write_error)?;
        transaction
            .execute(
                "DELETE FROM wallet_operations WHERE rowid NOT IN
            (SELECT rowid FROM wallet_operations ORDER BY rowid DESC LIMIT 1000)",
                [],
            )
            .map_err(write_error)?;
        // Update authenticated metadata inside the same transaction as the content.
        let old_revision = self.header.revision;
        self.header.revision = next_revision;
        let commit = (|| {
            write_header(&transaction, &self.header, &self.key)?;
            let bytes: i64 = transaction
                .query_row(
                    "SELECT
                (SELECT coalesce(sum(length(ciphertext) + length(nonce)), 0) FROM wallet_records) +
                (SELECT coalesce(sum(length(result_ciphertext)), 0) FROM wallet_operations)",
                    [],
                    |r| r.get(0),
                )
                .map_err(read_error)?;
            if bytes > CONTENT_LIMIT {
                return Err(WalletError::Quota);
            }
            check_session()?;
            transaction.commit().map_err(write_error)
        })();
        if let Err(error) = commit {
            self.header.revision = old_revision;
            return Err(error);
        }
        Ok(receipt.result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vault() -> Vault {
        Vault::initialize(
            Connection::open_in_memory().unwrap(),
            crypto::random_key().unwrap(),
            KeyPolicy::Device {
                key_reference: "synthetic-test-key".into(),
            },
        )
        .unwrap()
    }

    #[test]
    fn encrypted_mutations_retry_and_detect_stale_edits() {
        let mut vault = vault();
        let id = Uuid::new_v4();
        let operation_id = Uuid::new_v4();
        let request = || Mutation {
            id,
            operation_id,
            category: Category::Card,
            expected_revision: None,
            payload: Some(b"synthetic holder 00123456"),
        };
        let first = vault.mutate(request()).unwrap();
        assert_eq!(first, vault.mutate(request()).unwrap());
        assert_eq!(
            vault.read(id, Category::Card).unwrap().1.as_slice(),
            b"synthetic holder 00123456"
        );
        let (_, encrypted) = vault.encrypted_record(&id.to_string(), "card").unwrap();
        assert!(!encrypted.ciphertext.windows(8).any(|w| w == b"00123456"));
        assert_eq!(
            vault.mutate(Mutation {
                payload: Some(b"changed"),
                ..request()
            }),
            Err(WalletError::InvalidOperation)
        );
        assert_eq!(
            vault.mutate(Mutation {
                operation_id: Uuid::new_v4(),
                ..request()
            }),
            Err(WalletError::Conflict)
        );
        assert_eq!(vault.revision(), 1);
        vault.authenticate_header().unwrap();
    }

    #[test]
    fn altered_header_fails_closed() {
        let vault = vault();
        vault
            .connection
            .execute("UPDATE wallet_header SET revision = 5", [])
            .unwrap();
        let header = Vault::read_header(&vault.connection).unwrap();
        let altered = Vault { header, ..vault };
        assert_eq!(
            altered.authenticate_header(),
            Err(WalletError::CorruptVault)
        );
    }

    #[test]
    fn failed_write_preserves_last_committed_state() {
        let mut vault = vault();
        vault
            .connection
            .execute_batch(
                "CREATE TRIGGER reject_receipt BEFORE INSERT ON wallet_operations
            BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END;",
            )
            .unwrap();
        let id = Uuid::new_v4();
        assert_eq!(
            vault.mutate(Mutation {
                id,
                operation_id: Uuid::new_v4(),
                category: Category::Card,
                expected_revision: None,
                payload: Some(b"synthetic")
            }),
            Err(WalletError::WriteFailure)
        );
        assert_eq!(vault.revision(), 0);
        assert!(matches!(
            vault.read(id, Category::Card),
            Err(WalletError::Missing)
        ));
        vault.authenticate_header().unwrap();
    }

    #[test]
    fn restart_and_disk_files_preserve_encryption() {
        let directory =
            std::env::temp_dir().join(format!("notables-wallet-test-{}", Uuid::new_v4()));
        std::fs::create_dir(&directory).unwrap();
        let path = directory.join("vault.sqlite");
        let key = crypto::random_key().unwrap();
        let mut vault = Vault::create(
            &path,
            key.clone(),
            KeyPolicy::Device {
                key_reference: "synthetic-test-key".into(),
            },
        )
        .unwrap();
        let id = Uuid::new_v4();
        let secret = b"synthetic-holder-and-identifier-0000123456789";
        let mut stale_writer = Vault::open(&path, key.clone()).unwrap();
        vault
            .mutate(Mutation {
                id,
                operation_id: Uuid::new_v4(),
                category: Category::Card,
                expected_revision: None,
                payload: Some(secret),
            })
            .unwrap();
        assert_eq!(
            stale_writer.mutate(Mutation {
                id: Uuid::new_v4(),
                operation_id: Uuid::new_v4(),
                category: Category::Card,
                expected_revision: None,
                payload: Some(b"stale writer")
            }),
            Err(WalletError::Conflict)
        );
        drop(stale_writer);
        for file in std::fs::read_dir(&directory).unwrap() {
            let bytes = std::fs::read(file.unwrap().path()).unwrap();
            assert!(!bytes.windows(secret.len()).any(|window| window == secret));
        }
        drop(vault);
        let mut vault = Vault::open(&path, key.clone()).unwrap();
        assert_eq!(vault.read(id, Category::Card).unwrap().1.as_slice(), secret);
        vault
            .mutate(Mutation {
                id,
                operation_id: Uuid::new_v4(),
                category: Category::Card,
                expected_revision: Some(1),
                payload: None,
            })
            .unwrap();
        assert!(matches!(
            vault.read(id, Category::Card),
            Err(WalletError::Missing)
        ));
        drop(vault);
        assert!(matches!(
            Vault::open(&path, crypto::random_key().unwrap()),
            Err(WalletError::CorruptVault)
        ));
        assert!(matches!(
            Vault::create(
                &path,
                key.clone(),
                KeyPolicy::Device {
                    key_reference: "synthetic-test-key".into()
                }
            ),
            Err(WalletError::WriteFailure)
        ));
        let connection = Connection::open(&path).unwrap();
        connection.pragma_update(None, "user_version", 99).unwrap();
        drop(connection);
        assert!(matches!(
            Vault::open(&path, key),
            Err(WalletError::UnsupportedFormat)
        ));
        let version: u32 = Connection::open(&path)
            .unwrap()
            .pragma_query_value(None, "user_version", |r| r.get(0))
            .unwrap();
        assert_eq!(version, 99);
        std::fs::remove_dir_all(directory).unwrap();
    }
}
