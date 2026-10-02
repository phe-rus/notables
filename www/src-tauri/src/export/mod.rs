//! Getting documents out of the app the way each system expects: the
//! native save dialog for files, and the native print dialog for pages.

use serde::{Serialize, Serializer};
use tauri::ipc::Request;
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, thiserror::Error)]
pub enum ExportError {
    #[error("the request is missing its {0}")]
    MissingInput(&'static str),
    #[error("could not write the file: {0}")]
    Io(#[from] std::io::Error),
    #[error("could not open the system dialog: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("the save location isn't a file on this device")]
    UnsupportedLocation,
    #[error("saving was interrupted")]
    Interrupted,
    #[cfg(mobile)]
    #[error("printing isn't available on this device")]
    PrintUnavailable,
}

impl Serialize for ExportError {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

type Result<T> = std::result::Result<T, ExportError>;

/// Body: the file's bytes. Header `x-file-name`: the suggested name.
/// Shows the system save dialog and writes the file where the person chose;
/// returns the path, or `None` if they cancelled.
#[tauri::command]
pub async fn export_save_file(app: AppHandle, request: Request<'_>) -> Result<Option<String>> {
    let bytes = crate::ipc_bytes::bytes(request.body())
        .ok_or(ExportError::MissingInput("file contents"))?;
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("document")
        .to_owned();

    tauri::async_runtime::spawn_blocking(move || {
        let Some(chosen) = app
            .dialog()
            .file()
            .set_file_name(&name)
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let path = chosen
            .into_path()
            .map_err(|_| ExportError::UnsupportedLocation)?;
        std::fs::write(&path, bytes)?;
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|_| ExportError::Interrupted)?
}

/// Opens the system print dialog for the current page.
#[cfg(desktop)]
#[tauri::command]
pub fn export_print(window: WebviewWindow) -> Result<()> {
    window.print()?;
    Ok(())
}

/// Phones have no print dialog for a web view; the page offers the PDF instead.
#[cfg(mobile)]
#[tauri::command]
pub fn export_print() -> Result<()> {
    Err(ExportError::PrintUnavailable)
}
