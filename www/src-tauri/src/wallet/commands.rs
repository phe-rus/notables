use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use uuid::Uuid;
use zeroize::Zeroizing;

use super::{
    card::Card,
    error::{Result, WalletError},
    session::{CardPage, InitializeMode, ListRequest, SaveRequest, SaveResult, Status, Wallet},
    vault::Receipt,
};

fn allowed_caller(label: &str, url: &tauri::Url, lock_only: bool) -> bool {
    if label != "main" {
        return false;
    }
    let local = (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (["http", "https"].contains(&url.scheme())
            && url.host_str() == Some("tauri.localhost")
            && url.port().is_none());
    let development = cfg!(debug_assertions)
        && url.scheme() == "http"
        && url.host_str() == Some("localhost")
        && url.port() == Some(3000);
    (local || development) && (lock_only || url.path() == "/wallet" || url.path() == "/wallet/")
}

fn check_window(window: &WebviewWindow, lock_only: bool) -> Result<()> {
    let url = window.url().map_err(|_| WalletError::Denied)?;
    if !allowed_caller(window.label(), &url, lock_only) {
        return Err(WalletError::Denied);
    }
    // Android does not implement the desktop focus getter. Native mobile
    // Suspended/Resumed events fence the session instead.
    #[cfg(desktop)]
    if !lock_only && !window.is_focused().unwrap_or(false) {
        return Err(WalletError::Locked);
    }
    Ok(())
}

async fn with_wallet<T: Send + 'static>(
    app: AppHandle,
    window: WebviewWindow,
    lock_only: bool,
    work: impl FnOnce(&Wallet) -> Result<T> + Send + 'static,
) -> Result<T> {
    check_window(&window, lock_only)?;
    tauri::async_runtime::spawn_blocking(move || {
        check_window(&window, lock_only)?;
        let result = work(&app.state::<Wallet>())?;
        check_window(&window, lock_only)?;
        Ok(result)
    })
    .await
    .map_err(|_| WalletError::Unavailable)?
}

#[tauri::command]
pub async fn wallet_status(app: AppHandle, window: WebviewWindow) -> Result<Status> {
    with_wallet(app, window, false, Wallet::status).await
}

#[tauri::command]
pub async fn wallet_initialize(
    app: AppHandle,
    window: WebviewWindow,
    mode: InitializeMode,
) -> Result<Status> {
    if !matches!(mode, InitializeMode::Device) {
        return Err(WalletError::InvalidInput);
    }
    with_wallet(app, window, false, move |wallet| {
        wallet.initialize(mode, None, None)
    })
    .await
}

#[tauri::command]
pub async fn wallet_unlock(
    app: AppHandle,
    window: WebviewWindow,
    method: String,
) -> Result<Status> {
    let _ = (app, window, method);
    // Native authentication adapters have not shipped. No password fallback.
    Err(WalletError::Unavailable)
}

/// Development migration only, with no product UI and no embedded credential.
#[tauri::command]
pub async fn wallet_migrate_prototype(
    app: AppHandle,
    window: WebviewWindow,
    password: String,
) -> Result<Status> {
    let password = Zeroizing::new(password);
    if !cfg!(debug_assertions) {
        return Err(WalletError::Denied);
    }
    with_wallet(app, window, false, move |wallet| {
        wallet.migrate_prototype(password)
    })
    .await
}

#[tauri::command]
pub async fn wallet_lock(app: AppHandle, window: WebviewWindow) -> Result<()> {
    check_window(&window, true)?;
    // Invalidate workers before waiting for a worker that holds the mutex.
    app.state::<Wallet>().invalidate();
    let _ = window.emit("wallet-locked", app.state::<Wallet>().generation());
    with_wallet(app, window, true, Wallet::lock).await
}

#[tauri::command]
pub async fn wallet_list(
    app: AppHandle,
    window: WebviewWindow,
    request: ListRequest,
) -> Result<CardPage> {
    with_wallet(app, window, false, move |wallet| wallet.list(request)).await
}

#[tauri::command]
pub async fn wallet_read(app: AppHandle, window: WebviewWindow, id: Uuid) -> Result<Card> {
    with_wallet(app, window, false, move |wallet| wallet.read(id)).await
}

#[tauri::command]
pub async fn wallet_activity(app: AppHandle, window: WebviewWindow) -> Result<u64> {
    with_wallet(app, window, false, Wallet::activity).await
}

#[tauri::command]
pub async fn wallet_save(
    app: AppHandle,
    window: WebviewWindow,
    request: SaveRequest,
) -> Result<SaveResult> {
    with_wallet(app, window, false, move |wallet| wallet.save(request)).await
}

#[tauri::command]
pub async fn wallet_delete(
    app: AppHandle,
    window: WebviewWindow,
    id: Uuid,
    operation_id: Uuid,
    expected_revision: i64,
) -> Result<Receipt> {
    with_wallet(app, window, false, move |wallet| {
        wallet.delete(id, operation_id, expected_revision)
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_local_main_wallet_can_read_content() {
        let url = |s| tauri::Url::parse(s).unwrap();
        assert!(allowed_caller(
            "main",
            &url("tauri://localhost/wallet"),
            false
        ));
        assert!(allowed_caller(
            "main",
            &url("https://tauri.localhost/wallet"),
            false
        ));
        assert!(!allowed_caller(
            "widget",
            &url("tauri://localhost/wallet"),
            false
        ));
        assert!(!allowed_caller(
            "main",
            &url("https://example.org/wallet"),
            false
        ));
        assert!(!allowed_caller(
            "main",
            &url("https://tauri.localhost.evil.org/wallet"),
            false
        ));
        assert!(!allowed_caller(
            "main",
            &url("tauri://localhost/p/publication"),
            false
        ));
        assert!(!allowed_caller(
            "main",
            &url("tauri://localhost/settings"),
            false
        ));
        assert!(allowed_caller(
            "main",
            &url("tauri://localhost/settings"),
            true
        ));
    }
}
