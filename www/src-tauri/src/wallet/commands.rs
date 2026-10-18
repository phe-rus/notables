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
    #[cfg(target_os = "android")]
    {
        let wallet = window.app_handle().state::<Wallet>();
        wallet.refresh_foreground()?;
        if !lock_only && !wallet.is_foreground() {
            return Err(WalletError::Locked);
        }
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

async fn authenticate(
    app: &AppHandle,
    window: &WebviewWindow,
    reason: String,
    settings: bool,
) -> Result<()> {
    check_window(window, settings)?;
    if reason.trim().is_empty() || reason.chars().count() > 200 {
        return Err(WalletError::InvalidInput);
    }
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        use tauri_plugin_biometric::{AuthOptions, BiometricExt};
        handle
            .biometric()
            .authenticate(
                reason,
                AuthOptions {
                    allow_device_credential: true,
                    confirmation_required: Some(true),
                    ..Default::default()
                },
            )
            .map_err(|_| WalletError::Denied)
    })
    .await
    .map_err(|_| WalletError::Unavailable)??;
    // Android's system authentication activity returns before MainActivity resumes.
    for _ in 0..40 {
        #[cfg(target_os = "android")]
        app.state::<Wallet>().refresh_foreground()?;
        if app.state::<Wallet>().is_foreground() {
            check_window(window, settings)?;
            return Ok(());
        }
        tokio::time::sleep(std::time::Duration::from_millis(25)).await;
    }
    Err(WalletError::Locked)
}

#[tauri::command]
pub async fn wallet_authorize(
    app: AppHandle,
    window: WebviewWindow,
    reason: String,
) -> Result<Status> {
    check_window(&window, false)?;
    if app.state::<Wallet>().status()?.locked {
        return Err(WalletError::Locked);
    }
    authenticate(&app, &window, reason, false).await?;
    with_wallet(app, window, false, |wallet| {
        if wallet.status()?.locked {
            return Err(WalletError::Locked);
        }
        wallet.unlock_device(false)?;
        wallet.grant_sensitive()?;
        wallet.status()
    })
    .await
}

#[tauri::command]
pub async fn wallet_configure(
    app: AppHandle,
    window: WebviewWindow,
    minutes: u64,
    reason: String,
) -> Result<Status> {
    if !window
        .url()
        .map_err(|_| WalletError::Denied)?
        .path()
        .starts_with("/settings")
    {
        return Err(WalletError::Denied);
    }
    authenticate(&app, &window, reason, true).await?;
    with_wallet(app, window, true, move |wallet| {
        wallet.configure_timeout(minutes)
    })
    .await
}

#[tauri::command]
pub async fn wallet_reveal_field(
    app: AppHandle,
    window: WebviewWindow,
    id: Uuid,
    field_id: Uuid,
    reason: String,
) -> Result<Card> {
    check_window(&window, false)?;
    if app.state::<Wallet>().status()?.locked {
        return Err(WalletError::Locked);
    }
    if !app.state::<Wallet>().sensitive_unlocked()? {
        authenticate(&app, &window, reason, false).await?;
        if app.state::<Wallet>().status()?.locked {
            return Err(WalletError::Locked);
        }
        app.state::<Wallet>().unlock_device(false)?;
        app.state::<Wallet>().grant_sensitive()?;
    }
    with_wallet(app, window, false, move |wallet| {
        let card = wallet.read(id)?;
        if !card
            .draft
            .fields
            .iter()
            .any(|field| field.id == field_id && field.is_sensitive())
        {
            return Err(WalletError::InvalidInput);
        }
        Ok(card)
    })
    .await
}

#[tauri::command]
pub async fn wallet_status(app: AppHandle, window: WebviewWindow) -> Result<Status> {
    with_wallet(app, window, true, Wallet::status).await
}

/// Explicit developer access for physical testing. Release builds contain no unlock path.
#[tauri::command]
pub async fn wallet_development_unlock(
    app: AppHandle,
    window: WebviewWindow,
    sensitive: Option<bool>,
) -> Result<Status> {
    #[cfg(not(debug_assertions))]
    {
        let _ = (app, window, sensitive);
        Err(WalletError::Denied)
    }
    #[cfg(debug_assertions)]
    {
        with_wallet(app, window, false, move |wallet| {
            if !wallet.status()?.initialized {
                wallet.initialize(InitializeMode::Device, None, None)?;
            }
            wallet.unlock_device(true)?;
            wallet.reset_development_sensitive_grant()?;
            if sensitive.unwrap_or(false) {
                wallet.grant_sensitive()?;
            }
            wallet.status()
        })
        .await
    }
}

#[tauri::command]
pub async fn wallet_initialize(
    app: AppHandle,
    window: WebviewWindow,
    mode: InitializeMode,
    reason: String,
) -> Result<Status> {
    if !matches!(mode, InitializeMode::Device) {
        return Err(WalletError::InvalidInput);
    }
    authenticate(&app, &window, reason, false).await?;
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
    reason: String,
) -> Result<Status> {
    if !["passcode", "faceId", "fingerprint"].contains(&method.as_str()) {
        return Err(WalletError::InvalidInput);
    }
    authenticate(&app, &window, reason, false).await?;
    with_wallet(app, window, false, |wallet| wallet.unlock_device(true)).await
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
    with_wallet(app, window, false, move |wallet| {
        let card = wallet.read(id)?;
        Ok(if wallet.sensitive_unlocked()? {
            card
        } else {
            card.redact(None)
        })
    })
    .await
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
