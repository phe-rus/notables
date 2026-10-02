use tauri::{AppHandle, Manager, State};

use super::error::Result;
use super::{Models, PackStatus};
use crate::voice::Voice;

#[tauri::command]
pub async fn models_status(models: State<'_, Models>) -> Result<Vec<PackStatus>> {
    Ok(models.status().await)
}

/// Progress arrives as `models://status` events.
#[tauri::command]
pub async fn models_download(
    app: AppHandle,
    models: State<'_, Models>,
    id: String,
) -> Result<PackStatus> {
    models.download(&app, &id).await
}

/// The automatic download policy, started by the WebView after mount.
#[tauri::command]
pub async fn models_auto(
    app: AppHandle,
    models: State<'_, Models>,
    allow_metered: bool,
) -> Result<()> {
    models.auto(&app, allow_metered).await;
    Ok(())
}

/// The license text of an installed pack, shown in the app.
#[tauri::command]
pub fn models_license(models: State<'_, Models>, id: String) -> Option<String> {
    models.license_text(&id)
}

#[tauri::command]
pub async fn models_delete(app: AppHandle, models: State<'_, Models>, id: String) -> Result<()> {
    let voice = (id == crate::voice::PACK_ID).then(|| app.clone());
    models
        .delete(&app, &id, move || {
            if let Some(app) = voice {
                app.state::<Voice>().unload_all();
            }
        })
        .await
}
