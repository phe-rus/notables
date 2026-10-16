//! The space's root secret (spec 0005, AC-1): 32 random bytes that only the
//! person's own devices hold, kept in the system key store beside the
//! wallet's keys. Every other space key is derived from it in TypeScript.

use crate::wallet::keys::{DeviceKeyStore, KeyStore};

const REFERENCE: &str = "space-root";

/// Why the secret couldn't be read or kept; the frontend decides what to do.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpaceError {
    /// The device has no usable key store (iOS until its adapter ships).
    Unavailable,
    /// Not 32 bytes of hex.
    Invalid,
}

fn decode(hex: &str) -> Result<zeroize::Zeroizing<[u8; 32]>, SpaceError> {
    if hex.len() != 64 {
        return Err(SpaceError::Invalid);
    }
    let mut key = zeroize::Zeroizing::new([0u8; 32]);
    for (index, byte) in key.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&hex[index * 2..index * 2 + 2], 16)
            .map_err(|_| SpaceError::Invalid)?;
    }
    Ok(key)
}

fn encode(key: &[u8]) -> String {
    key.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn store_root(keys: &dyn KeyStore, key: &zeroize::Zeroizing<[u8; 32]>) -> Result<(), SpaceError> {
    keys.replace(REFERENCE, key)
        .map_err(|_| SpaceError::Unavailable)
}

/// The root secret as hex, or None when this device has no space yet (or no
/// key store, which the first write then reports).
#[tauri::command]
pub async fn space_root_read() -> Result<Option<String>, SpaceError> {
    tauri::async_runtime::spawn_blocking(|| {
        DeviceKeyStore
            .read(REFERENCE)
            .ok()
            .map(|key| encode(key.as_ref()))
    })
    .await
    .map_err(|_| SpaceError::Unavailable)
}

/// Keeps a new root secret: the first one, or one received when linking.
#[tauri::command]
pub async fn space_root_write(secret: String) -> Result<(), SpaceError> {
    let key = decode(&secret)?;
    tauri::async_runtime::spawn_blocking(move || store_root(&DeviceKeyStore, &key))
        .await
        .map_err(|_| SpaceError::Unavailable)?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wallet::{crypto::DataKey, error::WalletError};
    use std::sync::Mutex;

    struct CreateOnlyStore(Mutex<Option<[u8; 32]>>);

    impl KeyStore for CreateOnlyStore {
        fn read(&self, _: &str) -> crate::wallet::error::Result<DataKey> {
            self.0
                .lock()
                .unwrap()
                .map(zeroize::Zeroizing::new)
                .ok_or(WalletError::SecureStoreUnavailable)
        }

        fn write(&self, _: &str, key: &DataKey) -> crate::wallet::error::Result<()> {
            let mut stored = self.0.lock().unwrap();
            if stored.is_some() {
                return Err(WalletError::SecureStoreUnavailable);
            }
            *stored = Some(**key);
            Ok(())
        }

        fn remove(&self, _: &str) -> crate::wallet::error::Result<()> {
            *self.0.lock().unwrap() = None;
            Ok(())
        }

        fn replace(&self, _: &str, key: &DataKey) -> crate::wallet::error::Result<()> {
            *self.0.lock().unwrap() = Some(**key);
            Ok(())
        }
    }

    #[test]
    fn joining_replaces_the_existing_space_root() {
        let keys = CreateOnlyStore(Mutex::new(None));
        store_root(&keys, &decode(&"11".repeat(32)).unwrap()).unwrap();
        store_root(&keys, &decode(&"22".repeat(32)).unwrap()).unwrap();
        assert_eq!(
            encode(keys.read(REFERENCE).unwrap().as_ref()),
            "22".repeat(32)
        );
    }

    #[test]
    fn hex_round_trips() {
        let hex = "00ff10a0".repeat(8);
        assert_eq!(encode(decode(&hex).unwrap().as_ref()), hex);
    }

    #[test]
    fn rejects_other_lengths_and_characters() {
        assert!(decode("abcd").is_err());
        assert!(decode(&"zz".repeat(32)).is_err());
    }
}
