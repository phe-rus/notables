use super::{
    crypto::DataKey,
    error::{Result, WalletError},
};

/// OS credentials are accessed only from native blocking workers.
pub trait KeyStore: Send + Sync {
    fn read(&self, reference: &str) -> Result<DataKey>;
    fn write(&self, reference: &str, key: &DataKey) -> Result<()>;
    fn remove(&self, reference: &str) -> Result<()>;

    fn probe(&self) -> Result<()> {
        let reference = format!("probe-{}", uuid::Uuid::new_v4());
        let key = super::crypto::random_key()?;
        if let Err(error) = self.write(&reference, &key) {
            let _ = self.remove(&reference);
            return Err(error);
        }
        let read = self.read(&reference);
        let cleanup = self.remove(&reference);
        let restored = read?;
        cleanup?;
        if *key != *restored {
            return Err(WalletError::SecureStoreUnavailable);
        }
        Ok(())
    }
}

pub struct DeviceKeyStore;

#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
impl DeviceKeyStore {
    fn entry(reference: &str) -> Result<keyring::Entry> {
        if reference.is_empty() || reference.len() > 256 {
            return Err(WalletError::CorruptVault);
        }
        keyring::Entry::new("notables.pherus.org.wallet", reference)
            .map_err(|_| WalletError::SecureStoreUnavailable)
    }
}

#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
impl KeyStore for DeviceKeyStore {
    fn read(&self, reference: &str) -> Result<DataKey> {
        let secret = zeroize::Zeroizing::new(
            Self::entry(reference)?
                .get_secret()
                .map_err(|_| WalletError::SecureStoreUnavailable)?,
        );
        if secret.len() != 32 {
            return Err(WalletError::CorruptVault);
        }
        let mut key = zeroize::Zeroizing::new([0; 32]);
        key.copy_from_slice(&secret);
        Ok(key)
    }

    fn write(&self, reference: &str, key: &DataKey) -> Result<()> {
        Self::entry(reference)?
            .set_secret(key.as_ref())
            .map_err(|_| WalletError::SecureStoreUnavailable)?;
        if *self.read(reference)? != **key {
            return Err(WalletError::SecureStoreUnavailable);
        }
        Ok(())
    }

    fn remove(&self, reference: &str) -> Result<()> {
        Self::entry(reference)?
            .delete_credential()
            .map_err(|_| WalletError::SecureStoreUnavailable)
    }
}

// iOS remains unavailable until a device only Keychain adapter is implemented.
#[cfg(not(any(
    target_os = "macos",
    target_os = "windows",
    target_os = "linux",
    target_os = "android"
)))]
impl KeyStore for DeviceKeyStore {
    fn read(&self, _: &str) -> Result<DataKey> {
        Err(WalletError::SecureStoreUnavailable)
    }
    fn write(&self, _: &str, _: &DataKey) -> Result<()> {
        Err(WalletError::SecureStoreUnavailable)
    }
    fn remove(&self, _: &str) -> Result<()> {
        Err(WalletError::SecureStoreUnavailable)
    }
}

#[cfg(target_os = "android")]
#[path = "keys_android.rs"]
mod android;
