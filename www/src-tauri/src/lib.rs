//! The Notables native shell: hosts the `www` app on iOS, Android, macOS,
//! Windows and Linux, and provides device capabilities the WebView lacks:
//! durable on-device storage and on-device transcription.

mod storage;
mod transcription;

use tauri::Manager;

use storage::Storage;
use transcription::Transcriber;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Transcriber::default())
        .register_asynchronous_uri_scheme_protocol(
            storage::protocol::SCHEME,
            storage::protocol::handle,
        )
        .invoke_handler(tauri::generate_handler![
            storage::commands::storage_document_load,
            storage::commands::storage_document_append,
            storage::commands::storage_document_replace,
            storage::commands::storage_document_remove,
            storage::commands::storage_note_content_load,
            storage::commands::storage_note_content_save,
            storage::commands::storage_note_content_remove,
            storage::commands::storage_media_save,
            storage::commands::storage_media_remove,
            storage::commands::storage_meta_get,
            storage::commands::storage_meta_set,
            transcription::commands::whisper_model_status,
            transcription::commands::whisper_download_model,
            transcription::commands::whisper_transcribe,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let data_dir = app.path().app_data_dir()?;
            app.manage(Storage::open(&data_dir)?);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Notables");
}
