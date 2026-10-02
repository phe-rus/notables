use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use super::error::{Result, TranscriptionError};
use crate::models::Models;

/// Whisper "base": multilingual, ~148 MB, a good balance of speed and
/// accuracy on phones and laptops. It arrives as this model pack.
pub const PACK_ID: &str = "whisper-base";
const MODEL_FILE: &str = "ggml-base.bin";

/// The installed model file. A model an earlier version of the app
/// downloaded (`models/ggml-base.bin`) is adopted first, when it matches.
pub async fn model_path(app: &AppHandle) -> Result<PathBuf> {
    let models = app.state::<Models>();
    let legacy = models.dir().join(MODEL_FILE);
    if legacy.exists()
        && let Err(error) = models.adopt(app, PACK_ID, &legacy).await
    {
        log::warn!("adopting the earlier Whisper model: {error}");
    }
    models
        .installed(PACK_ID)
        .map(|(folder, _)| folder.join(MODEL_FILE))
        .filter(|path| path.exists())
        .ok_or(TranscriptionError::ModelMissing)
}
