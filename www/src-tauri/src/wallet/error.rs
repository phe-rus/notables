use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, thiserror::Error)]
#[serde(rename_all = "kebab-case")]
pub enum WalletError {
    #[error("invalid-input")]
    InvalidInput,
    #[error("invalid-operation")]
    InvalidOperation,
    #[error("corrupt-vault")]
    CorruptVault,
    #[error("unsupported-format")]
    UnsupportedFormat,
    #[error("write-failure")]
    WriteFailure,
    #[error("invalid-credential")]
    InvalidCredential,
    #[error("conflict")]
    Conflict,
    #[error("missing")]
    Missing,
    #[error("quota")]
    Quota,
    #[error("unavailable")]
    Unavailable,
    #[error("secure-store-unavailable")]
    SecureStoreUnavailable,
    #[error("locked")]
    Locked,
    #[error("denied")]
    Denied,
    #[error("already-initialized")]
    AlreadyInitialized,
    #[error("throttled")]
    Throttled,
    #[error("invalid-cursor")]
    InvalidCursor,
}

pub type Result<T> = std::result::Result<T, WalletError>;
