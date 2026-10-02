use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum VoiceError {
    #[error("the natural voice is not installed")]
    NotInstalled,
    #[error("the natural voice does not speak {0}")]
    UnsupportedLanguage(String),
    #[error("that voice style is not in the pack")]
    UnknownStyle,
    #[error("the voice model could not run: {0}")]
    Model(ort::Error),
    #[error("could not read the voice files: {0}")]
    Io(#[from] std::io::Error),
    #[error("could not read the voice files: {0}")]
    Json(#[from] serde_json::Error),
    #[error("speech was interrupted")]
    Interrupted,
}

impl<R> From<ort::Error<R>> for VoiceError
where
    ort::Error: From<ort::Error<R>>,
{
    fn from(error: ort::Error<R>) -> Self {
        Self::Model(ort::Error::from(error))
    }
}

impl VoiceError {
    fn code(&self) -> &'static str {
        match self {
            Self::NotInstalled => "not-installed",
            Self::UnsupportedLanguage(_) => "unsupported-language",
            Self::UnknownStyle => "unknown-style",
            _ => "failed",
        }
    }
}

/// Errors reach the WebView as `{ code, message }`, so it can fall back to
/// device voices when the pack is gone.
impl Serialize for VoiceError {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        let mut error = serializer.serialize_struct("VoiceError", 2)?;
        error.serialize_field("code", self.code())?;
        error.serialize_field("message", &self.to_string())?;
        error.end()
    }
}

pub type Result<T> = std::result::Result<T, VoiceError>;
