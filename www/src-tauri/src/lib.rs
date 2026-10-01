//! The Notables native shell: hosts the `www` app on iOS, Android, macOS,
//! Windows and Linux, and provides device capabilities the WebView lacks,
//! starting with on-device transcription.

mod transcription;

use transcription::{Transcriber, commands};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Transcriber::default())
        .invoke_handler(tauri::generate_handler![
            commands::whisper_model_status,
            commands::whisper_download_model,
            commands::whisper_transcribe,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Notables");
}
