use super::session::Wallet;

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum Platform {
    Desktop,
    Ios,
    Android,
}

impl Platform {
    pub(crate) const fn current() -> Self {
        if cfg!(target_os = "ios") {
            Self::Ios
        } else if cfg!(target_os = "android") {
            Self::Android
        } else {
            Self::Desktop
        }
    }
}

/// Returns whether the caller should notify the WebView to clear its cards.
pub(crate) fn focus_changed(wallet: &Wallet, focused: bool, platform: Platform) -> bool {
    // iOS becomes active after Face ID without entering foreground again.
    // Android focus is not its Activity lifecycle; retain onResume/JNI there.
    if focused && platform != Platform::Android {
        wallet.foreground();
    } else if !focused && platform == Platform::Desktop {
        wallet.background();
        return true;
    }
    false
}
