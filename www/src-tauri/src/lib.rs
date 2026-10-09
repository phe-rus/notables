//! The Notables native shell: hosts the `www` app on iOS, Android, macOS,
//! Windows and Linux, and provides device capabilities the WebView lacks:
//! durable on-device storage, on-device transcription, native saving and
//! printing, and widgets.

mod deep_links;
mod export;
mod ipc_bytes;
mod media_permissions;
mod models;
mod storage;
mod system_settings;
mod transcription;
mod voice;
pub mod wallet;
mod widgets;
mod window_frame;

use tauri::{Emitter, Manager};

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
        .on_window_event(|window, event| {
            if window.label() == "main"
                && let Some(wallet) = window.app_handle().try_state::<wallet::session::Wallet>()
            {
                match event {
                    tauri::WindowEvent::Focused(false) | tauri::WindowEvent::Destroyed => {
                        wallet.background();
                        let _ = window.emit("wallet-locked", wallet.generation());
                    }
                    tauri::WindowEvent::Focused(true) => wallet.foreground(),
                    #[cfg(mobile)]
                    tauri::WindowEvent::Suspended => {
                        wallet.background();
                        let _ = window.emit("wallet-locked", wallet.generation());
                    }
                    #[cfg(mobile)]
                    tauri::WindowEvent::Resumed => wallet.foreground(),
                    _ => {}
                }
            }
        })
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Transcriber::default())
        .manage(Voice::default())
        .register_asynchronous_uri_scheme_protocol(
            storage::protocol::SCHEME,
            storage::protocol::handle,
        )
        .invoke_handler(tauri::generate_handler![
            wallet::commands::wallet_status,
            wallet::commands::wallet_initialize,
            wallet::commands::wallet_unlock,
            wallet::commands::wallet_migrate_prototype,
            wallet::commands::wallet_lock,
            wallet::commands::wallet_list,
            wallet::commands::wallet_read,
            wallet::commands::wallet_activity,
            wallet::commands::wallet_save,
            wallet::commands::wallet_delete,
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
            storage::commands::storage_media_base,
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
            #[cfg(target_os = "android")]
            app.handle().plugin(tauri_plugin_nfc::init())?;
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
            app.manage(wallet::session::Wallet::new(&data_dir));
            let wallet_app = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut timer = tokio::time::interval(std::time::Duration::from_secs(1));
                loop {
                    timer.tick().await;
                    let wallet = wallet_app.state::<wallet::session::Wallet>();
                    if wallet.expire_idle() {
                        let _ = wallet_app.emit_to("main", "wallet-locked", wallet.generation());
                    }
                }
            });
            app.manage(Storage::open(&data_dir)?);
            #[cfg(target_os = "linux")]
            match storage::media_server::MediaServer::start(app.handle().clone()) {
                Ok(server) => {
                    app.manage(server);
                }
                Err(error) => log::warn!("media server: {error}"),
            }
            let models = Models::new(&data_dir);
            models.clean_up();
            app.manage(models);
            voice::start_idle_unloading(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Notables");
}
