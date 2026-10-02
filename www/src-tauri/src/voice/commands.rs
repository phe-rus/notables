use tauri::ipc::Response;
use tauri::{AppHandle, Manager};

use super::error::{Result, VoiceError};
use super::{Voice, VoiceInfo};
use crate::models::Models;

#[tauri::command]
pub fn voice_info(app: AppHandle) -> Option<VoiceInfo> {
    Voice::info(&app.state::<Models>())
}

/// Loads the voice when a read aloud surface opens, so the first line is quick.
#[tauri::command]
pub async fn voice_warm(app: AppHandle) {
    let _ = tauri::async_runtime::spawn_blocking(move || {
        app.state::<Voice>().warm(&app.state::<Models>());
    })
    .await;
}

/// Returns raw little-endian f32 mono samples at the pack's sample rate.
#[tauri::command]
pub async fn voice_synthesize(
    app: AppHandle,
    text: String,
    lang: String,
    version: String,
    style: Option<String>,
    speed: f32,
) -> Result<Response> {
    let samples = tauri::async_runtime::spawn_blocking(move || {
        app.state::<Voice>().synthesize(
            &app.state::<Models>(),
            &text,
            &lang,
            &version,
            style.as_deref(),
            speed,
        )
    })
    .await
    .map_err(|_| VoiceError::Interrupted)??;
    let bytes: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
    Ok(Response::new(bytes))
}
