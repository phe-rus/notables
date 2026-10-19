use std::{sync::mpsc, time::Duration};

use objc2::MainThreadMarker;
use objc2_ui_kit::{UIApplication, UIApplicationState};
use tauri::AppHandle;

use crate::wallet::error::{Result, WalletError};

fn active_on_main_thread(marker: MainThreadMarker) -> bool {
    UIApplication::sharedApplication(marker).applicationState() == UIApplicationState::Active
}

/// Face ID can resign active without a matching Tao resume callback. Query
/// UIKit on its main thread instead of trusting the cached window lifecycle.
pub(super) fn is_active(app: &AppHandle) -> Result<bool> {
    if let Some(marker) = MainThreadMarker::new() {
        return Ok(active_on_main_thread(marker));
    }
    let (sender, receiver) = mpsc::sync_channel(1);
    app.run_on_main_thread(move || {
        let active = MainThreadMarker::new().map(active_on_main_thread);
        let _ = sender.send(active);
    })
    .map_err(|_| WalletError::Unavailable)?;
    receiver
        .recv_timeout(Duration::from_secs(2))
        .map_err(|_| WalletError::Unavailable)?
        .ok_or(WalletError::Unavailable)
}
