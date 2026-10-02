//! The Notables native shell: hosts the `www` app on iOS, Android, macOS,
//! Windows and Linux, and provides device capabilities the WebView lacks:
//! durable on-device storage, on-device transcription, native saving and
//! printing, and widgets.

mod deep_links;
mod export;
mod media_permissions;
mod models;
mod storage;
mod system_settings;
mod transcription;
mod voice;
mod widgets;
mod window_frame;

use tauri::Manager;

use models::Models;
use storage::Storage;
use transcription::Transcriber;
use voice::Voice;

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
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Transcriber::default())
        .manage(Voice::default())
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
            transcription::commands::whisper_transcribe_media,
            models::commands::models_status,
            models::commands::models_download,
            models::commands::models_auto,
            models::commands::models_delete,
            models::commands::models_license,
            voice::commands::voice_info,
            voice::commands::voice_warm,
            voice::commands::voice_synthesize,
            window_frame::window_frame,
            widgets::widgets_publish,
            #[cfg(desktop)]
            widgets::widgets_desktop,
            #[cfg(desktop)]
            widgets::widgets_open,
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
            // Development on Linux: the page's console goes to the terminal.
            #[cfg(all(debug_assertions, target_os = "linux"))]
            if let Some(window) = app.get_webview_window("main") {
                window.with_webview(|webview| {
                    use webkit2gtk::{SettingsExt, WebViewExt};
                    if let Some(settings) = webview.inner().settings() {
                        settings.set_enable_write_console_messages_to_stdout(true);
                    }
                })?;
            }
            media_permissions::allow_microphone(app)?;
            window_frame::setup(app)?;
            deep_links::register(app);
            let data_dir = app.path().app_data_dir()?;
            app.manage(Storage::open(&data_dir)?);
            let models = Models::new(&data_dir);
            models.clean_up();
            app.manage(models);
            voice::start_idle_unloading(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Notables");
}
