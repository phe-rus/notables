use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::{
    XChaCha20Poly1305, XNonce,
    aead::{Aead, KeyInit, OsRng, Payload, rand_core::RngCore},
};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use super::error::{Result, WalletError};

pub const FORMAT_VERSION: u32 = 1;
pub type DataKey = Zeroizing<[u8; 32]>;

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Envelope {
    pub nonce: [u8; 24],
    pub ciphertext: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PasswordWrapper {
    pub version: u32,
    pub memory_kib: u32,
    pub iterations: u32,
    pub parallelism: u32,
    pub salt: [u8; 16],
    pub envelope: Envelope,
}

pub fn random_key() -> Result<DataKey> {
    let mut key = Zeroizing::new([0; 32]);
    OsRng
        .try_fill_bytes(key.as_mut())
        .map_err(|_| WalletError::Unavailable)?;
    Ok(key)
}

pub fn seal(key: &DataKey, plaintext: &[u8], context: &[u8]) -> Result<Envelope> {
    let mut nonce = [0; 24];
    OsRng
        .try_fill_bytes(&mut nonce)
        .map_err(|_| WalletError::Unavailable)?;
    let cipher =
        XChaCha20Poly1305::new_from_slice(key.as_ref()).map_err(|_| WalletError::InvalidInput)?;
    let ciphertext = cipher
        .encrypt(
            XNonce::from_slice(&nonce),
            Payload {
                msg: plaintext,
                aad: context,
            },
        )
        .map_err(|_| WalletError::WriteFailure)?;
    Ok(Envelope { nonce, ciphertext })
}

pub fn unseal(key: &DataKey, envelope: &Envelope, context: &[u8]) -> Result<Zeroizing<Vec<u8>>> {
    let cipher =
        XChaCha20Poly1305::new_from_slice(key.as_ref()).map_err(|_| WalletError::InvalidInput)?;
    cipher
        .decrypt(
            XNonce::from_slice(&envelope.nonce),
            Payload {
                msg: &envelope.ciphertext,
                aad: context,
            },
        )
        .map(Zeroizing::new)
        .map_err(|_| WalletError::CorruptVault)
}

fn derive(password: &str, salt: &[u8; 16]) -> Result<DataKey> {
    if password.chars().count() < 12 || password.len() > 1024 {
        return Err(WalletError::InvalidInput);
    }
    let params = Params::new(65_536, 3, 1, Some(32)).map_err(|_| WalletError::InvalidInput)?;
    let mut key = Zeroizing::new([0; 32]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(password.as_bytes(), salt, key.as_mut())
        .map_err(|_| WalletError::InvalidInput)?;
    Ok(key)
}

pub fn wrap_password(key: &DataKey, password: &str, context: &[u8]) -> Result<PasswordWrapper> {
    let mut salt = [0; 16];
    OsRng
        .try_fill_bytes(&mut salt)
        .map_err(|_| WalletError::Unavailable)?;
    let wrapping_key = derive(password, &salt)?;
    Ok(PasswordWrapper {
        version: 0x13,
        memory_kib: 65_536,
        iterations: 3,
        parallelism: 1,
        salt,
        envelope: seal(&wrapping_key, key.as_ref(), context)?,
    })
}

pub fn unwrap_password(
    wrapper: &PasswordWrapper,
    password: &str,
    context: &[u8],
) -> Result<DataKey> {
    // Reject hostile derivation parameters before allocating Argon2 memory.
    if (
        wrapper.version,
        wrapper.memory_kib,
        wrapper.iterations,
        wrapper.parallelism,
    ) != (0x13, 65_536, 3, 1)
        || wrapper.envelope.ciphertext.len() != 48
    {
        return Err(WalletError::UnsupportedFormat);
    }
    let wrapping_key = derive(password, &wrapper.salt)?;
    let plaintext = unseal(&wrapping_key, &wrapper.envelope, context)
        .map_err(|_| WalletError::InvalidCredential)?;
    let mut key = Zeroizing::new([0; 32]);
    key.copy_from_slice(&plaintext);
    Ok(key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fresh_nonces_and_authenticated_context() {
        let key = random_key().unwrap();
        let first = seal(&key, b"00123456", b"wallet:card:1").unwrap();
        let second = seal(&key, b"00123456", b"wallet:card:1").unwrap();
        assert_ne!(first.nonce, second.nonce);
        assert_ne!(first.ciphertext, second.ciphertext);
        assert_eq!(
            unseal(&key, &first, b"wallet:card:1").unwrap().as_slice(),
            b"00123456"
        );
        assert!(matches!(
            unseal(&key, &first, b"wallet:card:2"),
            Err(WalletError::CorruptVault)
        ));
        let mut changed_nonce = seal(&key, b"00123456", b"wallet:card:1").unwrap();
        changed_nonce.nonce[0] ^= 1;
        assert!(matches!(
            unseal(&key, &changed_nonce, b"wallet:card:1"),
            Err(WalletError::CorruptVault)
        ));
        let mut changed = first;
        changed.ciphertext[0] ^= 1;
        assert!(matches!(
            unseal(&key, &changed, b"wallet:card:1"),
            Err(WalletError::CorruptVault)
        ));
    }

    #[test]
    fn password_wrapper_rejects_wrong_password_and_parameters() {
        let key = random_key().unwrap();
        let mut wrapper = wrap_password(&key, "a synthetic password", b"wallet:1").unwrap();
        assert_eq!(
            *unwrap_password(&wrapper, "a synthetic password", b"wallet:1").unwrap(),
            *key
        );
        assert!(matches!(
            unwrap_password(&wrapper, "another wrong password", b"wallet:1"),
            Err(WalletError::InvalidCredential)
        ));
        wrapper.memory_kib = u32::MAX;
        assert!(matches!(
            unwrap_password(&wrapper, "a synthetic password", b"wallet:1"),
            Err(WalletError::UnsupportedFormat)
        ));
    }

    #[test]
    fn passwords_keep_whitespace_and_unicode_and_enforce_bounds() {
        assert!(matches!(
            derive("short", &[0; 16]),
            Err(WalletError::InvalidInput)
        ));
        assert!(matches!(
            derive(&"a".repeat(1025), &[0; 16]),
            Err(WalletError::InvalidInput)
        ));
        let salt = [7; 16];
        assert_ne!(
            *derive("  a synthetic password  ", &salt).unwrap(),
            *derive("a synthetic password", &salt).unwrap()
        );
        assert_ne!(
            *derive("synthetic password é", &salt).unwrap(),
            *derive("synthetic password e\u{301}", &salt).unwrap()
        );
    }
}
