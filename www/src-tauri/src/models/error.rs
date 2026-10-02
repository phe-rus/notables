use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum ModelsError {
    #[error("unknown model pack: {0}")]
    UnknownPack(String),
    #[error("the model list could not be reached")]
    NoManifest,
    #[error("not enough free space")]
    NoSpace,
    #[error("network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("the server refused the download ({0})")]
    Server(u16),
    #[error("a downloaded file did not match its checksum")]
    Checksum,
    #[error("the download was cancelled")]
    Cancelled,
    #[error("could not read or write a model file: {0}")]
    Io(#[from] std::io::Error),
    #[error("could not read model data: {0}")]
    Json(#[from] serde_json::Error),
    #[error("could not locate the app data folder: {0}")]
    Path(#[from] tauri::Error),
    #[error("model work was interrupted")]
    Interrupted,
}

impl ModelsError {
    /// The short reason shown in Settings (translated in the WebView).
    pub fn reason(&self) -> &'static str {
        match self {
            Self::NoSpace => "no-space",
            Self::Checksum => "checksum",
            Self::Server(_) => "server",
            _ => "network",
        }
    }
}

/// Commands return errors to the WebView as plain messages.
impl Serialize for ModelsError {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, ModelsError>;
