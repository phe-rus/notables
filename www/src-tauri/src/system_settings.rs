//! Opens the right page of the system settings, so people can change a
//! permission they declined without hunting for it.

/// Opens the microphone privacy settings where the system has such a page.
/// Returns false where there is nothing to open (Linux desktops, phones).
#[tauri::command]
pub fn open_microphone_settings() -> bool {
    #[cfg(target_os = "macos")]
    let opened = std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
        .spawn()
        .is_ok();
    #[cfg(target_os = "windows")]
    let opened = std::process::Command::new("cmd")
        .args(["/C", "start", "", "ms-settings:privacy-microphone"])
        .spawn()
        .is_ok();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let opened = false;
    opened
}
