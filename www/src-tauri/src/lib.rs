//! The Notables native shell: hosts the `www` app on iOS, Android, macOS,
//! Windows and Linux. Device capabilities (SQLite, audio, on-device
//! transcription) will be exposed to the app as Tauri commands from here.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
