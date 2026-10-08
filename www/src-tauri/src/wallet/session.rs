use std::{
    path::{Path, PathBuf},
    sync::{
        Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use zeroize::Zeroizing;

use super::{
    card::{Card, CardDraft, CardPreview},
    crypto,
    error::{Result, WalletError},
    keys::{DeviceKeyStore, KeyStore},
    vault::{AuditEvent, Category, KeyPolicy, Mutation, Receipt, Vault},
};

const IDLE_LIMIT: Duration = Duration::from_secs(300);
const PASSWORD_CONTEXT: &[u8] = b"notables:wallet:password-wrapper:1";

#[cfg(test)]
#[path = "session_tests.rs"]
mod tests;

fn publish_vault(staging: &Path, destination: &Path) -> Result<()> {
    #[cfg(target_os = "android")]
    {
        use std::{ffi::CString, os::unix::ffi::OsStrExt};
        let source =
            CString::new(staging.as_os_str().as_bytes()).map_err(|_| WalletError::WriteFailure)?;
        let target = CString::new(destination.as_os_str().as_bytes())
            .map_err(|_| WalletError::WriteFailure)?;
        // Android SELinux denies hard links. Use the kernel syscall so this
        // also works before the renameat2 libc symbol became available.
        // Both C strings live for the call; NOREPLACE preserves existing vaults.
        let result = unsafe {
            libc::syscall(
                libc::SYS_renameat2,
                libc::AT_FDCWD,
                source.as_ptr(),
                libc::AT_FDCWD,
                target.as_ptr(),
                libc::RENAME_NOREPLACE,
            )
        };
        if result != 0 {
            return Err(WalletError::WriteFailure);
        }
    }
    #[cfg(not(target_os = "android"))]
    {
        std::fs::hard_link(staging, destination).map_err(|_| WalletError::WriteFailure)?;
        std::fs::remove_file(staging).map_err(|_| WalletError::WriteFailure)?;
    }
    Ok(())
}

pub fn now() -> Result<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .map_err(|_| WalletError::Unavailable)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub initialized: bool,
    pub secure_store_available: bool,
    pub protected: bool,
    pub locked: bool,
    pub system_auth_available: bool,
    pub generation: u64,
    pub format_version: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InitializeMode {
    Device,
    Password,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SaveRequest {
    pub operation_id: Uuid,
    pub draft: CardDraft,
    pub expected_revision: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    pub id: Uuid,
    pub revision: i64,
}

#[derive(Deserialize, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ListRequest {
    pub cursor: Option<String>,
    pub limit: Option<usize>,
    pub sort: String,
    pub search: String,
    pub kind: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardPage {
    pub cards: Vec<CardPreview>,
    pub next_cursor: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Cursor {
    generation: u64,
    revision: i64,
    offset: usize,
    query: ListRequest,
}

struct Session {
    vault: Option<Vault>,
    epoch: u64,
    last_activity: Instant,
    failures: u32,
    backoff_until: Option<Instant>,
    secure_store_available: Option<bool>,
    pending_audits: Vec<AuditEvent>,
}

/// One native mutex serializes credentials, content and revisions. The epoch
/// changes immediately on background, even while a worker is in Argon2 or SQLite.
pub struct Wallet {
    path: PathBuf,
    keys: Box<dyn KeyStore>,
    state: Mutex<Session>,
    epoch: AtomicU64,
    foreground: AtomicBool,
}

impl Wallet {
    pub fn new(data_dir: &Path) -> Self {
        Self::with_keys(data_dir, Box::new(DeviceKeyStore))
    }

    fn with_keys(data_dir: &Path, keys: Box<dyn KeyStore>) -> Self {
        Self {
            path: data_dir.join("wallet").join("vault.sqlite"),
            keys,
            state: Mutex::new(Session {
                vault: None,
                epoch: 1,
                last_activity: Instant::now(),
                failures: 0,
                backoff_until: None,
                secure_store_available: None,
                pending_audits: Vec::new(),
            }),
            epoch: AtomicU64::new(1),
            foreground: AtomicBool::new(true),
        }
    }

    pub fn generation(&self) -> u64 {
        self.epoch.load(Ordering::SeqCst)
    }

    pub fn invalidate(&self) {
        self.epoch.fetch_add(1, Ordering::SeqCst);
    }

    pub fn expire_idle(&self) -> bool {
        if let Ok(mut state) = self.state.try_lock()
            && state
                .vault
                .as_ref()
                .is_some_and(|v| v.protected() && state.last_activity.elapsed() >= IDLE_LIMIT)
        {
            self.invalidate();
            state.vault = None;
            state.epoch = self.generation();
            return true;
        }
        false
    }

    pub fn background(&self) {
        self.foreground.store(false, Ordering::SeqCst);
        self.epoch.fetch_add(1, Ordering::SeqCst);
        if let Ok(mut state) = self.state.try_lock() {
            state.vault = None;
        }
    }

    pub fn foreground(&self) {
        self.foreground.store(true, Ordering::SeqCst);
    }

    fn check(&self, epoch: u64) -> Result<()> {
        if !self.foreground.load(Ordering::SeqCst) || self.generation() != epoch {
            return Err(WalletError::Locked);
        }
        Ok(())
    }

    fn session(&self) -> Result<std::sync::MutexGuard<'_, Session>> {
        let mut state = self.state.lock().map_err(|_| WalletError::Unavailable)?;
        if state.epoch != self.generation()
            || !self.foreground.load(Ordering::SeqCst)
            || state
                .vault
                .as_ref()
                .is_some_and(|v| v.protected() && state.last_activity.elapsed() >= IDLE_LIMIT)
        {
            if state.epoch == self.generation() && state.vault.is_some() {
                self.epoch.fetch_add(1, Ordering::SeqCst);
            }
            state.vault = None;
            state.epoch = self.generation();
        }
        Ok(state)
    }

    fn status_locked(&self, state: &mut Session) -> Result<Status> {
        let initialized = self
            .path
            .try_exists()
            .map_err(|_| WalletError::Unavailable)?;
        let protected = if initialized {
            matches!(
                Vault::inspect(&self.path)?.policy,
                KeyPolicy::Password { .. }
            )
        } else {
            false
        };
        if initialized
            && !protected
            && state.vault.is_none()
            && self.foreground.load(Ordering::SeqCst)
        {
            let header = Vault::inspect(&self.path)?;
            if let KeyPolicy::Device { key_reference } = header.policy {
                let key = self.keys.read(&key_reference)?;
                let vault = Vault::open(&self.path, key)?;
                self.check(state.epoch)?;
                state.vault = Some(vault);
                state.last_activity = Instant::now();
            }
        }
        let available = *state
            .secure_store_available
            .get_or_insert_with(|| self.keys.probe().is_ok());
        Ok(Status {
            initialized,
            protected,
            secure_store_available: available,
            locked: initialized && state.vault.is_none(),
            generation: self.generation(),
            format_version: crypto::FORMAT_VERSION,
            system_auth_available: false,
        })
    }

    pub fn status(&self) -> Result<Status> {
        let mut state = self.session()?;
        self.status_locked(&mut state)
    }

    pub fn initialize(
        &self,
        mode: InitializeMode,
        password: Option<Zeroizing<String>>,
        confirmation: Option<Zeroizing<String>>,
    ) -> Result<Status> {
        let mut state = self.session()?;
        self.check(state.epoch)?;
        if self
            .path
            .try_exists()
            .map_err(|_| WalletError::Unavailable)?
        {
            return Err(WalletError::AlreadyInitialized);
        }
        let key = crypto::random_key()?;
        let reference = format!("wallet-{}-g1", Uuid::new_v4());
        let policy = match mode {
            InitializeMode::Device => {
                if password.is_some() || confirmation.is_some() {
                    return Err(WalletError::InvalidInput);
                }
                if let Err(error) = self.keys.write(&reference, &key) {
                    let _ = self.keys.remove(&reference);
                    return Err(error);
                }
                KeyPolicy::Device {
                    key_reference: reference.clone(),
                }
            }
            InitializeMode::Password => {
                let password = password.ok_or(WalletError::InvalidInput)?;
                if confirmation.as_ref().map(|s| s.as_str()) != Some(password.as_str()) {
                    return Err(WalletError::InvalidInput);
                }
                let wrapper = crypto::wrap_password(&key, &password, PASSWORD_CONTEXT)?;
                if *crypto::unwrap_password(&wrapper, &password, PASSWORD_CONTEXT)? != *key {
                    return Err(WalletError::InvalidCredential);
                }
                KeyPolicy::Password { wrapper }
            }
        };
        let device = matches!(policy, KeyPolicy::Device { .. });
        let parent = self.path.parent().ok_or(WalletError::Unavailable)?;
        let staging = parent.join(format!("{}.staging", Uuid::new_v4()));
        let initialized = (|| {
            std::fs::create_dir_all(parent).map_err(|_| WalletError::WriteFailure)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(parent, std::fs::Permissions::from_mode(0o700))
                    .map_err(|_| WalletError::WriteFailure)?;
            }
            let vault = Vault::create(&staging, key.clone(), policy)?;
            drop(vault);
            drop(Vault::open(&staging, key.clone())?);
            self.check(state.epoch)?;
            // Publish without replacing a vault created by another process.
            publish_vault(&staging, &self.path)?;
            state.vault = Some(Vault::open(&self.path, key)?);
            state.last_activity = Instant::now();
            self.status_locked(&mut state)
        })();
        if initialized.is_err() && !self.path.exists() {
            let _ = std::fs::remove_file(&staging);
            if device {
                let _ = self.keys.remove(&reference);
            }
        }
        initialized
    }

    pub fn unlock(&self, password: Zeroizing<String>) -> Result<Status> {
        let mut state = self.session()?;
        self.check(state.epoch)?;
        if state
            .backoff_until
            .is_some_and(|until| until > Instant::now())
        {
            return Err(WalletError::Throttled);
        }
        let header = Vault::inspect(&self.path)?;
        let KeyPolicy::Password { wrapper } = header.policy else {
            return Err(WalletError::InvalidInput);
        };
        let key = match crypto::unwrap_password(&wrapper, &password, PASSWORD_CONTEXT) {
            Ok(key) => key,
            Err(WalletError::InvalidCredential | WalletError::InvalidInput) => {
                if state.pending_audits.len() >= 1000 {
                    state.pending_audits.remove(0);
                }
                state.pending_audits.push(AuditEvent {
                    action: "unlock".into(),
                    time: now()?,
                    outcome: "failure".into(),
                    operation_id: Uuid::new_v4(),
                });
                state.failures = state.failures.saturating_add(1);
                if state.failures >= 5 {
                    state.backoff_until = Some(
                        Instant::now()
                            + Duration::from_secs((1u64 << (state.failures - 5).min(5)).min(30)),
                    );
                }
                return Err(WalletError::InvalidCredential);
            }
            Err(error) => return Err(error),
        };
        let mut vault = Vault::open(&self.path, key)?;
        self.check(state.epoch)?;
        let event = AuditEvent {
            action: "unlock".into(),
            time: now()?,
            outcome: "success".into(),
            operation_id: Uuid::new_v4(),
        };
        if state.pending_audits.len() >= 1000 {
            state.pending_audits.remove(0);
        }
        state.pending_audits.push(event);
        vault.record_audits(&state.pending_audits, || self.check(state.epoch))?;
        state.pending_audits.clear();
        self.check(state.epoch)?;
        self.invalidate();
        state.epoch = self.generation();
        state.vault = Some(vault);
        state.failures = 0;
        state.backoff_until = None;
        state.last_activity = Instant::now();
        self.status_locked(&mut state)
    }

    pub fn migrate_prototype(&self, password: Zeroizing<String>) -> Result<Status> {
        if !cfg!(debug_assertions) {
            return Err(WalletError::Denied);
        }
        if matches!(
            Vault::inspect(&self.path)?.policy,
            KeyPolicy::Password { .. }
        ) {
            self.unlock(password)?;
        } else {
            // Debug fixture already moved to device storage can retire an older
            // prototype data key through the same authenticated transaction.
            self.status()?;
        }
        let mut state = self.session()?;
        let epoch = state.epoch;
        let migration = state
            .vault
            .as_mut()
            .ok_or(WalletError::Locked)?
            .migrate_prototype_to_device(self.keys.as_ref(), || self.check(epoch));
        // Force a reopen through the committed device wrapper. Failure retains
        // ciphertext and cannot keep a stale in memory access policy alive.
        state.vault = None;
        migration?;
        self.status_locked(&mut state)
    }

    pub fn lock(&self) -> Result<()> {
        self.epoch.fetch_add(1, Ordering::SeqCst);
        let mut state = self.state.lock().map_err(|_| WalletError::Unavailable)?;
        state.vault = None;
        state.epoch = self.generation();
        Ok(())
    }

    pub fn read(&self, id: Uuid) -> Result<Card> {
        let mut state = self.session()?;
        self.check(state.epoch)?;
        let (revision, bytes) = state
            .vault
            .as_ref()
            .ok_or(WalletError::Locked)?
            .read(id, Category::Card)?;
        let card = Card::decode(&bytes, id, revision)?;
        self.check(state.epoch)?;
        state.last_activity = Instant::now();
        Ok(card)
    }

    pub fn activity(&self) -> Result<u64> {
        let mut state = self.session()?;
        self.check(state.epoch)?;
        if state.vault.is_none() {
            return Err(WalletError::Locked);
        }
        state.last_activity = Instant::now();
        Ok(state.epoch)
    }

    pub fn save(&self, mut request: SaveRequest) -> Result<SaveResult> {
        request.draft.validate()?;
        let mut state = self.session()?;
        let epoch = state.epoch;
        self.check(epoch)?;
        let vault = state.vault.as_mut().ok_or(WalletError::Locked)?;
        let previous = match vault.read(request.draft.id, Category::Card) {
            Ok((revision, bytes)) => Some(Card::decode(&bytes, request.draft.id, revision)?),
            Err(WalletError::Missing) => None,
            Err(error) => return Err(error),
        };
        let time = now()?;
        let created_at = previous.as_ref().map_or(time, |card| card.created_at);
        let updated_at = previous
            .as_ref()
            .map_or(time, |card| time.max(card.updated_at));
        let fingerprint = Zeroizing::new(
            serde_json::to_vec(&(
                "save",
                request.operation_id,
                &request.draft,
                request.expected_revision,
            ))
            .map_err(|_| WalletError::InvalidInput)?,
        );
        let card = Card {
            format_version: 1,
            revision: request
                .expected_revision
                .unwrap_or(0)
                .checked_add(1)
                .ok_or(WalletError::Quota)?,
            created_at,
            updated_at,
            draft: request.draft,
        };
        let payload =
            Zeroizing::new(serde_json::to_vec(&card).map_err(|_| WalletError::InvalidInput)?);
        let event = AuditEvent {
            action: "save".into(),
            time,
            outcome: "success".into(),
            operation_id: request.operation_id,
        };
        let receipt = vault.mutate_checked(
            Mutation {
                operation_id: request.operation_id,
                id: card.draft.id,
                category: Category::Card,
                expected_revision: request.expected_revision,
                payload: Some(&payload),
            },
            Some(&fingerprint),
            Some(&event),
            || self.check(epoch),
        )?;
        state.last_activity = Instant::now();
        Ok(SaveResult {
            id: card.draft.id,
            revision: receipt.record_revision,
        })
    }

    pub fn delete(&self, id: Uuid, operation: Uuid, revision: i64) -> Result<Receipt> {
        let mut state = self.session()?;
        let epoch = state.epoch;
        self.check(epoch)?;
        let event = AuditEvent {
            action: "delete".into(),
            time: now()?,
            outcome: "success".into(),
            operation_id: operation,
        };
        let result = state
            .vault
            .as_mut()
            .ok_or(WalletError::Locked)?
            .mutate_checked(
                Mutation {
                    id,
                    operation_id: operation,
                    category: Category::Card,
                    expected_revision: Some(revision),
                    payload: None,
                },
                None,
                Some(&event),
                || self.check(epoch),
            )?;
        state.last_activity = Instant::now();
        Ok(result)
    }

    pub fn list(&self, mut request: ListRequest) -> Result<CardPage> {
        use base64::Engine;
        let mut state = self.session()?;
        let epoch = state.epoch;
        self.check(epoch)?;
        let vault = state.vault.as_ref().ok_or(WalletError::Locked)?;
        let limit = request.limit.unwrap_or(25);
        if !(1..=50).contains(&limit)
            || request.search.chars().count() > 200
            || !["updated", "name"].contains(&request.sort.as_str())
            || request.kind.as_ref().is_some_and(|k| {
                ![
                    "bank",
                    "national-id",
                    "passport",
                    "electricity",
                    "television",
                    "sim",
                    "membership",
                    "other",
                ]
                .contains(&k.as_str())
            })
        {
            return Err(WalletError::InvalidInput);
        }
        let encoded = request.cursor.take();
        let offset = if let Some(encoded) = encoded {
            if encoded.len() > 4096 {
                return Err(WalletError::InvalidCursor);
            }
            let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
                .decode(encoded)
                .map_err(|_| WalletError::InvalidCursor)?;
            let cursor: Cursor =
                serde_json::from_slice(&bytes).map_err(|_| WalletError::InvalidCursor)?;
            if cursor.generation != epoch
                || cursor.revision != vault.revision()
                || cursor.query != request
                || cursor.offset > 1000
            {
                return Err(WalletError::InvalidCursor);
            }
            cursor.offset
        } else {
            0
        };
        let search = request.search.to_lowercase();
        let mut cards = Vec::new();
        for (id, revision, payload) in vault.records(Category::Card)? {
            let card = Card::decode(&payload, id, revision)?;
            if (request
                .kind
                .as_ref()
                .is_none_or(|kind| kind == &card.draft.kind))
                && (card.draft.display_name.to_lowercase().contains(&search)
                    || card
                        .draft
                        .issuer
                        .as_ref()
                        .is_some_and(|s| s.to_lowercase().contains(&search)))
            {
                cards.push(card.preview());
            }
        }
        if request.sort == "name" {
            cards.sort_by(|a, b| a.display_name.cmp(&b.display_name).then(a.id.cmp(&b.id)));
        } else {
            cards.sort_by(|a, b| b.updated_at.cmp(&a.updated_at).then(a.id.cmp(&b.id)));
        }
        let next = offset + limit;
        let next_cursor = if next < cards.len() {
            Some(
                base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(
                    serde_json::to_vec(&Cursor {
                        generation: epoch,
                        revision: vault.revision(),
                        offset: next,
                        query: request,
                    })
                    .map_err(|_| WalletError::InvalidInput)?,
                ),
            )
        } else {
            None
        };
        let cards = cards.into_iter().skip(offset).take(limit).collect();
        self.check(epoch)?;
        state.last_activity = Instant::now();
        Ok(CardPage { cards, next_cursor })
    }
}
