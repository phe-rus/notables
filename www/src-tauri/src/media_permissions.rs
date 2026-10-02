//! Lets the app's own pages use the microphone. On Linux, WebKitGTK denies
//! every media request unless the embedding app approves it; macOS, Windows,
//! iOS and Android ask the person through the system instead.

use tauri::{Manager, Runtime};

/// Approves microphone and device-list requests from the main window's page.
#[cfg(target_os = "linux")]
pub fn allow_microphone<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    use webkit2gtk::glib::prelude::Cast;
    use webkit2gtk::{
        DeviceInfoPermissionRequest, PermissionRequestExt, UserMediaPermissionRequest, WebViewExt,
    };

    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    window.with_webview(|webview| {
        webview.inner().connect_permission_request(|_, request| {
            let media = request
                .downcast_ref::<UserMediaPermissionRequest>()
                .is_some()
                || request
                    .downcast_ref::<DeviceInfoPermissionRequest>()
                    .is_some();
            if media {
                request.allow();
            }
            // Handled media requests; let WebKit decide (deny) anything else.
            media
        });
    })
}

#[cfg(not(target_os = "linux"))]
pub fn allow_microphone<R: Runtime>(_app: &tauri::App<R>) -> tauri::Result<()> {
    Ok(())
}
