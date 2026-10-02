//! The Notables native shell: hosts the `www` app on iOS, Android, macOS,
//! Windows and Linux, and provides device capabilities the WebView lacks:
//! durable on-device storage, on-device transcription, and native saving
//! and printing.

mod deep_links;
mod export;
mod media_permissions;
mod storage;
mod system_settings;
mod transcription;
mod window_frame;

use tauri::Manager;

use storage::Storage;
use transcription::Transcriber;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // First, so a second launch (say, from a link) hands over to this one.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        deep_links::focus_main(app);
    }));
    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Transcriber::default())
        .register_asynchronous_uri_scheme_protocol(
            storage::protocol::SCHEME,
            storage::protocol::handle,
        )
        .invoke_handler(tauri::generate_handler![
            export::export_save_file,
            export::export_print,
            system_settings::open_microphone_settings,
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
            window_frame::window_frame,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Windows and Linux get the app's own window controls (see
            // www/src/components/window); macOS keeps its traffic lights.
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            if let Some(window) = app.get_webview_window("main") {
                window.set_decorations(false)?;
                // On Windows 11 a shadow also gives the undecorated window the
                // system's rounded corners. Linux rounds the page itself, in a
                // transparent window (tauri.linux.conf.json).
                #[cfg(target_os = "windows")]
                window.set_shadow(true)?;
            }
            media_permissions::allow_microphone(app)?;
            window_frame::setup(app)?;
            deep_links::register(app);
            let data_dir = app.path().app_data_dir()?;
            app.manage(Storage::open(&data_dir)?);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Notables");
}
