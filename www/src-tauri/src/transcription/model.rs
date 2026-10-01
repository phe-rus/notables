use std::path::PathBuf;

use futures_util::StreamExt;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

use super::error::Result;

/// Whisper "base": multilingual, ~142 MB, a good balance of speed and
/// accuracy on phones and laptops.
pub const MODEL_FILE: &str = "ggml-base.bin";
const MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";

pub fn model_path(app: &AppHandle) -> Result<PathBuf> {
    Ok(app.path().app_data_dir()?.join("models").join(MODEL_FILE))
}

/// Downloads the model to a temporary file and moves it into place once
/// complete, so an interrupted download never leaves a broken model.
pub async fn download(app: &AppHandle, on_progress: impl Fn(u64, Option<u64>)) -> Result<PathBuf> {
    let path = model_path(app)?;
    if let Some(dir) = path.parent() {
        tokio::fs::create_dir_all(dir).await?;
    }
    let partial = path.with_extension("part");

    let response = reqwest::get(MODEL_URL).await?.error_for_status()?;
    let total = response.content_length();
    let mut file = tokio::fs::File::create(&partial).await?;
    let mut received = 0u64;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await?;
        received += chunk.len() as u64;
        on_progress(received, total);
    }
    file.flush().await?;
    drop(file);
    tokio::fs::rename(&partial, &path).await?;
    Ok(path)
}
