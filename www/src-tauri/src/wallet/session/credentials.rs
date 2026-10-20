use std::time::{Duration, Instant};

use uuid::Uuid;
use zeroize::Zeroizing;

use super::super::{
    crypto,
    error::{Result, WalletError},
    vault::{AuditEvent, KeyPolicy, Vault},
};
use super::{InitializeMode, Status, Wallet, now, publication::publish_vault};

pub(super) const PASSWORD_CONTEXT: &[u8] = b"notables:wallet:password-wrapper:1";

impl Wallet {
    /// Called only after the native OS authentication command succeeds.
    pub(crate) fn unlock_device(&self, restart: bool) -> Result<Status> {
        let mut state = self.session()?;
        let header = Vault::inspect(&self.path)?;
        let KeyPolicy::Device { key_reference } = header.policy else {
            return Err(WalletError::Unavailable);
        };
        let key = self.keys.read(&key_reference)?;
        let vault = Vault::open(&self.path, key)?;
        self.check(state.epoch)?;
        state.vault = Some(vault);
        if restart || self.access_expired(&state) {
            state.authorized_at = Some(Instant::now());
        }
        state.last_activity = Instant::now();
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
            if self.authentication_required {
                state.authorized_at = Some(Instant::now());
            }
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
}
