//! Whether the app rounds its own window corners. On Linux the window is
//! undecorated and transparent, so the page can clip itself to a rounded
//! shape, but only where a compositor can actually show transparency.
//! ChromeOS's Linux frames app windows itself and can't show it, so there,
//! and without a compositor, the page stays square and the system frames it.

use tauri::{Manager, Runtime, State};

pub struct WindowFrame {
    pub rounded: bool,
}

/// "rounded" when the page should draw rounded corners, otherwise "system".
#[tauri::command]
pub fn window_frame(state: State<'_, WindowFrame>) -> &'static str {
    if state.rounded { "rounded" } else { "system" }
}

#[cfg(target_os = "linux")]
pub fn setup<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    use gtk::prelude::WidgetExt;

    let window = app.get_webview_window("main");
    let composited = window
        .as_ref()
        .and_then(|window| window.gtk_window().ok())
        .and_then(|gtk_window| gtk_window.screen())
        .is_some_and(|screen| screen.is_composited());
    let chromeos = std::path::Path::new("/dev/.cros_milestone").exists()
        || std::env::var_os("SOMMELIER_VERSION").is_some();
    let rounded = composited && !chromeos;
    if let (true, Some(window)) = (rounded, window) {
        // WebKitGTK paints an opaque background unless told otherwise, which
        // would show as a square window behind the rounded page.
        window.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)))?;
    }
    app.manage(WindowFrame { rounded });
    Ok(())
}

#[cfg(not(target_os = "linux"))]
pub fn setup<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    // Windows 11 and macOS round windows themselves.
    app.manage(WindowFrame { rounded: false });
    Ok(())
}
