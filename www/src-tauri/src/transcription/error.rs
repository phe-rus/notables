use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum TranscriptionError {
    #[error("the transcription model has not been downloaded yet")]
    ModelMissing,
    #[error("could not download the transcription model: {0}")]
    Download(#[from] crate::models::ModelsError),
    #[error("could not read or write the model file: {0}")]
    Io(#[from] std::io::Error),
    #[error("could not locate the app data folder: {0}")]
    Path(#[from] tauri::Error),
    #[error("audio must be 32-bit float samples")]
    InvalidAudio,
    #[error("this audio format can't be read")]
    UnsupportedAudio,
    #[error("that recording isn't on this device")]
    MediaMissing,
    #[error("transcription failed: {0}")]
    Whisper(#[from] whisper_rs::WhisperError),
    #[error("transcription was interrupted")]
    Interrupted,
}

/// Commands return errors to the WebView as plain messages.
impl Serialize for TranscriptionError {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, TranscriptionError>;
