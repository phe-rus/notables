use std::{
    sync::atomic::Ordering,
    time::{Duration, Instant},
};

use super::super::{
    crypto,
    error::{Result, WalletError},
    vault::{KeyPolicy, Vault},
};
use super::{Session, Status, Wallet, now};

#[cfg(target_os = "android")]
use super::lifecycle_android;
#[cfg(target_os = "ios")]
use super::lifecycle_ios;

pub(super) const IDLE_LIMIT: Duration = Duration::from_secs(300);

impl Wallet {
    pub(super) fn access_expired(&self, state: &Session) -> bool {
        if self.authentication_required {
            state.authorized_at.is_none_or(|at| {
                at.elapsed() >= Duration::from_secs(self.unlock_minutes.load(Ordering::SeqCst) * 60)
            })
        } else {
            state.last_activity.elapsed() >= IDLE_LIMIT
        }
    }

    pub fn sensitive_unlocked(&self) -> Result<bool> {
        let state = self.session()?;
        Ok(!self.access_expired(&state)
            && state
                .sensitive_at
                .is_some_and(|at| at.elapsed() < Duration::from_secs(300)))
    }

    pub(crate) fn grant_sensitive(&self) -> Result<()> {
        let mut state = self.session()?;
        if state.vault.is_none() {
            return Err(WalletError::Locked);
        }
        state.sensitive_at = Some(Instant::now());
        Ok(())
    }

    #[cfg(debug_assertions)]
    pub(crate) fn reset_development_sensitive_grant(&self) -> Result<()> {
        self.session()?.sensitive_at = None;
        Ok(())
    }

    pub(crate) fn configure_timeout(&self, minutes: u64) -> Result<Status> {
        if ![1, 5, 15, 30, 60, 120].contains(&minutes) {
            return Err(WalletError::InvalidInput);
        }
        let parent = self.path.parent().ok_or(WalletError::Unavailable)?;
        std::fs::create_dir_all(parent).map_err(|_| WalletError::WriteFailure)?;
        let temporary = parent.join("security.json.pending");
        std::fs::write(
            &temporary,
            serde_json::to_vec(&minutes).map_err(|_| WalletError::InvalidInput)?,
        )
        .map_err(|_| WalletError::WriteFailure)?;
        std::fs::rename(temporary, parent.join("security.json"))
            .map_err(|_| WalletError::WriteFailure)?;
        self.unlock_minutes.store(minutes, Ordering::SeqCst);
        self.status()
    }

    pub fn generation(&self) -> u64 {
        self.epoch.load(Ordering::SeqCst)
    }

    pub fn invalidate(&self) {
        self.epoch.fetch_add(1, Ordering::SeqCst);
    }

    pub fn expire_idle(&self) -> bool {
        if let Ok(mut state) = self.state.try_lock()
            && state.vault.as_ref().is_some_and(|v| {
                self.access_expired(&state) && (self.authentication_required || v.protected())
            })
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

    pub(super) fn check(&self, epoch: u64) -> Result<()> {
        if !self.foreground.load(Ordering::SeqCst) || self.generation() != epoch {
            return Err(WalletError::Locked);
        }
        Ok(())
    }

    pub(super) fn session(&self) -> Result<std::sync::MutexGuard<'_, Session>> {
        let mut state = self.state.lock().map_err(|_| WalletError::Unavailable)?;
        if state.epoch != self.generation()
            || !self.foreground.load(Ordering::SeqCst)
            || state.vault.as_ref().is_some_and(|v| {
                self.access_expired(&state) && (self.authentication_required || v.protected())
            })
        {
            if state.epoch == self.generation() && state.vault.is_some() {
                self.epoch.fetch_add(1, Ordering::SeqCst);
            }
            state.vault = None;
            state.epoch = self.generation();
        }
        Ok(state)
    }

    pub(super) fn status_locked(&self, state: &mut Session) -> Result<Status> {
        let initialized = self
            .path
            .try_exists()
            .map_err(|_| WalletError::Unavailable)?;
        let protected = self.authentication_required
            || if initialized {
                matches!(
                    Vault::inspect(&self.path)?.policy,
                    KeyPolicy::Password { .. }
                )
            } else {
                false
            };
        if initialized
            && (!protected || (self.authentication_required && !self.access_expired(state)))
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
            system_auth_available: cfg!(any(
                target_os = "android",
                target_os = "ios",
                target_os = "macos"
            )),
            unlock_minutes: self.unlock_minutes.load(Ordering::SeqCst),
            unlock_until: state
                .authorized_at
                .filter(|_| !self.access_expired(state))
                .map(|at| {
                    now().unwrap_or(0)
                        + (self.unlock_minutes.load(Ordering::SeqCst) * 60_000)
                            .saturating_sub(at.elapsed().as_millis() as u64)
                }),
            sensitive_until: state
                .sensitive_at
                .filter(|at| !self.access_expired(state) && at.elapsed() < Duration::from_secs(300))
                .map(|at| {
                    now().unwrap_or(0) + 300_000u64.saturating_sub(at.elapsed().as_millis() as u64)
                }),
        })
    }

    pub fn status(&self) -> Result<Status> {
        let mut state = self.session()?;
        self.status_locked(&mut state)
    }

    pub fn is_foreground(&self) -> bool {
        self.foreground.load(Ordering::SeqCst)
    }

    #[cfg(target_os = "android")]
    pub fn refresh_foreground(&self) -> Result<()> {
        if lifecycle_android::is_active()? {
            self.foreground();
        } else if self.is_foreground() {
            self.background();
        }
        Ok(())
    }

    #[cfg(target_os = "ios")]
    pub fn refresh_ios_foreground(&self, app: &tauri::AppHandle) -> Result<()> {
        crate::wallet::lifecycle::refresh_activity(self, lifecycle_ios::is_active(app)?);
        Ok(())
    }

    pub fn lock(&self) -> Result<()> {
        self.epoch.fetch_add(1, Ordering::SeqCst);
        let mut state = self.state.lock().map_err(|_| WalletError::Unavailable)?;
        state.vault = None;
        state.authorized_at = None;
        state.sensitive_at = None;
        state.epoch = self.generation();
        Ok(())
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
}
