use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("could not read or write a file: {0}")]
    Io(#[from] std::io::Error),
    #[error("could not locate the app data folder: {0}")]
    Path(#[from] tauri::Error),
    #[error("invalid identifier")]
    InvalidId,
    #[error("the request is missing its {0}")]
    MissingInput(&'static str),
    #[error("storage is unavailable after an earlier failure")]
    Poisoned,
    #[error("storage was interrupted")]
    Interrupted,
}

/// Commands return errors to the WebView as plain messages.
impl Serialize for StorageError {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, StorageError>;
