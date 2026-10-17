use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Manager, Runtime,
    plugin::{Builder, PluginHandle, TauriPlugin},
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_card_reader);

struct Reader<R: Runtime>(PluginHandle<R>);

#[derive(Serialize, Deserialize)]
struct Reading {
    text: String,
    confidence: f32,
}

#[derive(Serialize)]
struct Frame {
    image: String,
}

#[tauri::command]
async fn recognize<R: Runtime>(app: AppHandle<R>, image: String) -> Result<Reading, String> {
    if image.len() > 2_000_000 {
        return Err("invalid-image".into());
    }
    app.state::<Reader<R>>()
        .0
        .run_mobile_plugin("recognize", Frame { image })
        .map_err(|_| "recognition-failed".into())
}

#[tauri::command]
async fn cancel<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    app.state::<Reader<R>>()
        .0
        .run_mobile_plugin("cancel", ())
        .map_err(|_| "cancelled".into())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("card-reader")
        .invoke_handler(tauri::generate_handler![recognize, cancel])
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            let handle =
                api.register_android_plugin("org.pherus.cardreader", "CardReaderPlugin")?;
            #[cfg(target_os = "ios")]
            let handle = api.register_ios_plugin(init_plugin_card_reader)?;
            app.manage(Reader(handle));
            Ok(())
        })
        .build()
}
