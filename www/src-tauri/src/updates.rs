//! Selects the update destination from the installed distribution, not WebView UA.

#[tauri::command]
pub fn app_release_channel() -> Option<&'static str> {
    if cfg!(debug_assertions) {
        return None;
    }
    #[cfg(target_os = "ios")]
    {
        use objc2_foundation::NSBundle;
        let receipt = NSBundle::mainBundle().appStoreReceiptURL()?;
        let name = receipt.lastPathComponent()?.to_string();
        match name.as_str() {
            "sandboxReceipt" => Some("ios-testflight"),
            "receipt" => Some("ios-app-store"),
            _ => None,
        }
    }
    #[cfg(target_os = "android")]
    {
        Some("android-play")
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        Some("desktop")
    }
}
