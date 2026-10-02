//! Widgets: a small "today" snapshot (agenda, pinned and recent notes)
//! that the app writes whenever it changes, for the home-screen widgets
//! on iOS and Android to read (see `widgets/`), and a floating desktop
//! widget window on macOS, Windows and Linux.

use std::path::PathBuf;

use tauri::{AppHandle, Manager, Runtime};

/// Large enough for a week's agenda and a dozen notes, small enough to
/// read in a widget's tight time budget.
const MAX_SNAPSHOT_BYTES: usize = 64 * 1024;

/// Where widgets look for the snapshot, inside the app's data folder.
pub fn snapshot_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(dir.join("widgets").join("today.json"))
}

/// Saves the snapshot the app built, replacing the file in one step so a
/// widget never reads half of it.
#[tauri::command]
pub async fn widgets_publish(app: AppHandle, snapshot: String) -> Result<(), String> {
    if snapshot.len() > MAX_SNAPSHOT_BYTES {
        return Err("widget snapshot is too large".into());
    }
    serde_json::from_str::<serde_json::Value>(&snapshot)
        .map_err(|_| "widget snapshot is not JSON".to_string())?;
    let path = snapshot_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || write_atomically(&path, snapshot.as_bytes()))
        .await
        .map_err(|error| error.to_string())?
}

fn write_atomically(path: &PathBuf, bytes: &[u8]) -> Result<(), String> {
    let dir = path.parent().ok_or("no folder for the snapshot")?;
    std::fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");
    std::fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    std::fs::rename(&temporary, path).map_err(|error| error.to_string())
}

#[cfg(desktop)]
const WIDGET_LABEL: &str = "widget";

/// Shows or hides the desktop widget: a small window that floats above
/// other windows with today's plans and pinned notes. Returns whether it
/// is showing.
#[cfg(desktop)]
#[tauri::command]
pub fn widgets_desktop(app: AppHandle, show: bool) -> Result<bool, String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let existing = app.get_webview_window(WIDGET_LABEL);
    if !show {
        if let Some(window) = existing {
            window.close().map_err(|error| error.to_string())?;
        }
        return Ok(false);
    }
    if let Some(window) = existing {
        window.show().map_err(|error| error.to_string())?;
        return Ok(true);
    }

    let (width, height) = (320.0, 460.0);
    let mut builder =
        WebviewWindowBuilder::new(&app, WIDGET_LABEL, WebviewUrl::App("widget".into()))
            .title("Notables")
            .inner_size(width, height)
            .min_inner_size(260.0, 220.0)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .visible_on_all_workspaces(true);
    // Top right of the main screen, clear of the menu bar and window edges.
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale = monitor.scale_factor();
        let size = monitor.size().to_logical::<f64>(scale);
        let origin = monitor.position().to_logical::<f64>(scale);
        builder = builder.position(origin.x + size.width - width - 24.0, origin.y + 48.0);
    }
    let window = builder.build().map_err(|error| error.to_string())?;
    #[cfg(target_os = "windows")]
    window.set_shadow(true).map_err(|error| error.to_string())?;
    let _ = window;
    Ok(true)
}

/// Opens a place in the main window from the desktop widget.
#[cfg(desktop)]
#[tauri::command]
pub fn widgets_open(app: AppHandle, path: String) -> Result<(), String> {
    use tauri::Emitter;

    if !path.starts_with('/') {
        return Err("expected an app path".into());
    }
    crate::deep_links::focus_main(&app);
    app.emit_to("main", "widget-open", path)
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_the_snapshot_in_one_step() {
        let path = std::env::temp_dir()
            .join("notables-widget-test")
            .join("widgets")
            .join("today.json");
        write_atomically(&path, br#"{"version":1}"#).unwrap();
        write_atomically(&path, br#"{"version":1,"agenda":[]}"#).unwrap();
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            r#"{"version":1,"agenda":[]}"#
        );
        assert!(!path.with_extension("json.tmp").exists());
        let _ = std::fs::remove_dir_all(path.parent().unwrap().parent().unwrap());
    }
}
