# Wallet native dependencies

The wallet uses the existing SQLite dependency and these native packages.
Versions are resolved in `Cargo.lock`. No new network service is involved.

| Package | Version | License | Purpose |
|---|---|---|---|
| chacha20poly1305 | 0.10.1, pinned | MIT or Apache 2.0 | Authenticated record and key encryption |
| argon2 | 0.5.3, pinned | MIT or Apache 2.0 | Legacy prototype wrapper migration |
| keyring | 3.6.3, pinned | MIT or Apache 2.0 | Desktop native key storage |
| jni | 0.21.1, pinned on Android | MIT or Apache 2.0 | Native only Android Keystore bridge |
| ndk-context | 0.1.1, pinned on Android | MIT or Apache 2.0 | Borrow Tao application context on native workers |
| libc | 0.2.189, pinned on Android | MIT or Apache 2.0 | Atomic vault publication without overwriting existing files |
| zeroize | 1.9.0, locked | MIT or Apache 2.0 | Clear native key and temporary byte buffers |
| tauri-plugin-nfc | 2.4.1, vendored Android patch | MIT or Apache 2.0 | Read-only NFC capability and cancellable card acquisition |
| @tauri-apps/plugin-nfc | 2.4.1, pinned | MIT or Apache 2.0 | Frontend NFC guest bindings |
| sha2 | 0.10.9, locked | MIT or Apache 2.0 | Retry request fingerprints |

License declarations were checked in the installed Cargo package manifests.
Linux explicitly uses Secret Service. macOS uses Keychain and Windows uses
Credential Manager. Mobile targets cannot select keyring's mock backend.
Android now has a native AndroidKeyStore AES GCM wrapper adapter, compiled into
the ARM64 debug APK. Its encrypted key wrappers live in the app backup excluded
directory. The physical TECNO device key probe and prototype migration passed. iOS remains unavailable
until a device only Keychain adapter is implemented and tested. New wallets
accept device storage only. Legacy password wrappers remain preserved for a
safe authenticated migration and are not a supported protection method.
