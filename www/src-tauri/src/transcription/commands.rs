use serde::Serialize;
use tauri::ipc::{Channel, InvokeBody, Request};
use tauri::{AppHandle, Manager};

use super::engine::{Segment, Transcriber, samples_from_bytes};
use super::error::{Result, TranscriptionError};
use super::model;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    downloaded: bool,
    size_bytes: Option<u64>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    received_bytes: u64,
    total_bytes: Option<u64>,
}

#[tauri::command]
pub async fn whisper_model_status(app: AppHandle) -> Result<ModelStatus> {
    let path = model::model_path(&app)?;
    let size = tokio::fs::metadata(&path).await.ok().map(|meta| meta.len());
    Ok(ModelStatus {
        downloaded: size.is_some(),
        size_bytes: size,
    })
}

#[tauri::command]
pub async fn whisper_download_model(
    app: AppHandle,
    on_progress: Channel<DownloadProgress>,
) -> Result<()> {
    model::download(&app, |received_bytes, total_bytes| {
        let _ = on_progress.send(DownloadProgress {
            received_bytes,
            total_bytes,
        });
    })
    .await?;
    Ok(())
}

/// Body: raw little-endian f32 samples at 16 kHz mono.
/// Optional header `x-language`: an ISO 639-1 code, or omitted to detect.
#[tauri::command]
pub async fn whisper_transcribe(app: AppHandle, request: Request<'_>) -> Result<Vec<Segment>> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(TranscriptionError::InvalidAudio);
    };
    let samples = samples_from_bytes(bytes)?;
    let language = request
        .headers()
        .get("x-language")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);

    let path = model::model_path(&app)?;
    if !path.exists() {
        return Err(TranscriptionError::ModelMissing);
    }
    // whisper.cpp is CPU-bound: run it on a blocking worker, not the async runtime.
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<Transcriber>()
            .transcribe(&path, &samples, language.as_deref())
    })
    .await
    .map_err(|_| TranscriptionError::Interrupted)?
}
