mod access;
mod cards;
mod credentials;
mod publication;
mod types;

use types::Session;
pub use types::{CardPage, InitializeMode, ListRequest, SaveRequest, SaveResult, Status};

use std::{
    path::{Path, PathBuf},
    sync::{
        Mutex,
        atomic::{AtomicBool, AtomicU64},
    },
    time::{Instant, SystemTime, UNIX_EPOCH},
};

use super::{
    error::{Result, WalletError},
    keys::{DeviceKeyStore, KeyStore},
};

#[cfg(test)]
#[path = "session_tests.rs"]
mod tests;

#[cfg(target_os = "android")]
#[path = "lifecycle_android.rs"]
mod lifecycle_android;

#[cfg(target_os = "ios")]
#[path = "lifecycle_ios.rs"]
mod lifecycle_ios;

pub fn now() -> Result<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .map_err(|_| WalletError::Unavailable)
}

/// One native mutex serializes credentials, content and revisions. The epoch
/// changes immediately on background, even while a worker is in Argon2 or SQLite.
pub struct Wallet {
    path: PathBuf,
    keys: Box<dyn KeyStore>,
    state: Mutex<Session>,
    epoch: AtomicU64,
    foreground: AtomicBool,
    authentication_required: bool,
    unlock_minutes: AtomicU64,
}

impl Wallet {
    pub fn new(data_dir: &Path) -> Self {
        {
            let mut wallet = Self::with_keys(data_dir, Box::new(DeviceKeyStore));
            wallet.authentication_required = true;
            wallet
        }
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
                authorized_at: None,
                sensitive_at: None,
            }),
            epoch: AtomicU64::new(1),
            foreground: AtomicBool::new(true),
            authentication_required: false,
            unlock_minutes: AtomicU64::new(
                std::fs::read(data_dir.join("wallet").join("security.json"))
                    .ok()
                    .and_then(|data| serde_json::from_slice::<u64>(&data).ok())
                    .filter(|minutes| [1, 5, 15, 30, 60, 120].contains(minutes))
                    .unwrap_or(30),
            ),
        }
    }
}
