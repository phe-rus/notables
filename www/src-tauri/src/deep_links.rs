//! `notables://` links open the installed app at the right place: a note,
//! a book, an invoice or a document check. The page handles where a link
//! goes; here the app claims the scheme, and on desktop a link opened while
//! Notables is running goes to that window instead of starting another.

use tauri::{AppHandle, Manager, Runtime};

/// Claims the scheme at run time where the system needs it: Linux and
/// Windows register handlers per install, and in development nothing is
/// installed. macOS, iOS and Android read it from the app bundle.
pub fn register<R: Runtime>(app: &tauri::App<R>) {
    #[cfg(any(windows, target_os = "linux"))]
    {
        use tauri_plugin_deep_link::DeepLinkExt;
        if let Err(error) = app.deep_link().register_all() {
            log::warn!("couldn't register notables:// links: {error}");
        }
    }
    #[cfg(not(any(windows, target_os = "linux")))]
    let _ = app;
}

/// Brings the existing window forward when a second launch hands over a link.
#[cfg(desktop)]
pub fn focus_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
