use serde::Serialize;
use tauri::ipc::{Channel, InvokeBody, Request};
use tauri::{AppHandle, Manager};

use super::decode::{self, SAMPLE_RATE};
use super::engine::{Segment, Transcriber, samples_from_bytes};
use super::error::{Result, TranscriptionError};
use super::model;
use crate::models::Models;

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

/// A thin wrapper over the `whisper-base` model pack.
#[tauri::command]
pub async fn whisper_model_status(app: AppHandle) -> Result<ModelStatus> {
    let path = model::model_path(&app).await.ok();
    let size = match path {
        Some(path) => tokio::fs::metadata(&path).await.ok().map(|meta| meta.len()),
        None => None,
    };
    Ok(ModelStatus {
        downloaded: size.is_some(),
        size_bytes: size,
    })
}

/// Downloads the `whisper-base` model pack, reporting progress on the channel.
#[tauri::command]
pub async fn whisper_download_model(
    app: AppHandle,
    on_progress: Channel<DownloadProgress>,
) -> Result<()> {
    let report = |status: &crate::models::PackStatus| {
        let _ = on_progress.send(DownloadProgress {
            received_bytes: status.received_bytes,
            total_bytes: status.bytes,
        });
    };
    app.state::<Models>()
        .download_observed(&app, model::PACK_ID, Some(&report))
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

    let path = model::model_path(&app).await?;
    // whisper.cpp is CPU-bound: run it on a blocking worker, not the async runtime.
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<Transcriber>()
            .transcribe(&path, &samples, language.as_deref())
    })
    .await
    .map_err(|_| TranscriptionError::Interrupted)?
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProgress {
    /// Audio transcribed so far.
    done_ms: u64,
    /// Length of the recording, when known.
    total_ms: Option<u64>,
    /// Phrases found in the latest stretch, timed from the start.
    segments: Vec<Segment>,
}

/// Transcribes a stored recording of any length (an audiobook chapter,
/// say), reading and decoding the file here a few minutes at a time.
/// Progress, with the phrases found so far, streams to `on_progress`.
#[tauri::command]
pub async fn whisper_transcribe_media(
    app: AppHandle,
    media_id: String,
    language: Option<String>,
    on_progress: Channel<MediaProgress>,
) -> Result<Vec<Segment>> {
    let model = model::model_path(&app).await?;
    let (file, _) = app
        .state::<crate::storage::Storage>()
        .media_file(&media_id)
        .ok()
        .flatten()
        .ok_or(TranscriptionError::MediaMissing)?;

    tauri::async_runtime::spawn_blocking(move || {
        let transcriber = app.state::<Transcriber>();
        let total_ms = decode::duration_ms(&file);
        let mut all = Vec::new();
        // Five minutes at a time keeps memory small and progress lively.
        decode::decode_windows(&file, 300, |samples, start| {
            let offset_ms = (start * 1000 / u64::from(SAMPLE_RATE)) as i64;
            let found: Vec<Segment> = transcriber
                .transcribe(&model, samples, language.as_deref())?
                .into_iter()
                .map(|segment| Segment {
                    start_ms: segment.start_ms + offset_ms,
                    end_ms: segment.end_ms + offset_ms,
                    text: segment.text,
                })
                .collect();
            let done_ms = (start + samples.len() as u64) * 1000 / u64::from(SAMPLE_RATE);
            // A closed listener means the person moved on: stop early.
            let listening = on_progress
                .send(MediaProgress {
                    done_ms,
                    total_ms,
                    segments: found.clone(),
                })
                .is_ok();
            all.extend(found);
            Ok(listening)
        })?;
        Ok(all)
    })
    .await
    .map_err(|_| TranscriptionError::Interrupted)?
}
