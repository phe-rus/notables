# Wallet context and resume checkpoint

Read this before resuming wallet work. The user resumed on 8 October 2026 and
authorized physical phone interaction by saying “proceed”. Continue wallet work
within this scope and preserve existing app data.

## Authoritative product direction

**Updated 9 October 2026 (supersedes the protection choices below and in
spec 0003):** the wallet uses the same security model as the planned Vault.
Protection stays off by default (passwordless, still encrypted at rest).
When turned on, the choices are PassPin (a short app PIN), a password, and
the device's Face ID, fingerprint or passcode where the device offers them.
Wallet is a phone tab (Notes, Wallet, Invoices, Settings); Books moved to
the sidebar.

The user rejected the current manual form, list layout and forced password
experience. Follow Apple Wallet for the card stack, add journey and presentation.
Start adding a card with scanning or image import, then review recognized details.
Manual editing supports corrections rather than being the main add experience.
Keep the wallet home focused on cards, not search, sorting and forms.

A fresh wallet requires no wallet credential. Protection is optional and off by
default. The only protection choices are Passcode, Face ID and Fingerprint.
Use native device authentication and real capability results. Face ID belongs
on supported Apple devices. Do not offer a wallet password, password confirmation,
password fallback or a fourth authentication method. Do not force protection
because a native secure store adapter is missing. Encryption at rest remains
required even when access protection is off.

The updated direction is in
[spec 0003](../../../../docs/specs/www/0003-digital-card-wallet/index.md).
Its current product direction supersedes older conflicting guidance. The vault and backup contracts now remove withdrawn password requirements.
Backup and recovery remain deferred until a native protected design is approved.
Resolve any remaining legacy scope wording against the user’s correction.
Do not treat the existing code as an approved UX reference.

## Current code

Frontend: this directory, `www/src/routes/_app/wallet.tsx`, sidebar navigation,
Settings Account entry and all six language catalogs. State uses TanStack Store,
forms use TanStack Form, invoke payloads use strict Zod schemas. Decrypted values
stay in memory. Epoch checks discard pending results after lock or unmount.

Native: `www/src-tauri/src/wallet`. Separate encrypted SQLite vault, authenticated
records and header, revision checks, bounded retry receipts, quotas, encrypted
audits, native monotonic idle expiry and local main window caller checks.
Desktop adapters and an AndroidKeyStore AES GCM device key adapter exist. The
Android probe passed on the physical phone. iOS has no key adapter. Fresh setup
and normal unlock expose no password flow. Legacy wrapper reading is retained
for debug prototype migration only, whose command rejects release builds.

Wallet ACL files: `www/src-tauri/permissions/wallet.toml` and
`www/src-tauri/capabilities/wallet.json`. Existing app commands have their own
permission file to preserve their behavior after introducing custom command ACLs.

Preserve these fixes found on a physical Android phone:

1. Android's desktop `is_focused()` getter always returns false. Check it only
   on desktop. Mobile sessions use native Suspended and Resumed window events.
2. Android SELinux denies hard links in app data. `publish_vault` uses the
   renameat2 kernel syscall with RENAME_NOREPLACE on Android. Other targets
   publish with exclusive hard links. Never overwrite an existing vault.

## Physical phone evidence

The user wants actual mobile device testing before further feature expansion.
The connected phone was TECNO CI6, Android 13, adb serial `085452525P011328`.
An emulator was also connected. Always select the phone explicitly and confirm
it is still attached. Never assume an emulator result is physical target evidence.

The latest ARM64 debug APK installed with `adb install -r`, preserving app data.
The app, Settings, sidebar and wallet setup rendered. The two Android fixes above
were rebuilt and installed. Password setup succeeded and the empty wallet loaded.
No sample card was saved. Saving, editing, deleting, masking, presentation,
restart, background locking and idle locking have no completed phone evidence.

The user authorized resuming phone interaction. Operate Notables and necessary
native permission or file selection dialogs only. Reconfirm attachment before
selecting the physical target.

The empty prototype vault was migrated to device storage on the phone and
reopened after a full process restart without a credential. Its previous synthetic
credential was `Wallet-test-2026`, retained here solely for historical fixture
recovery, never for product setup. The final migration implementation also rotates
the data key and preserves card revisions and retry receipts atomically. The
final rotation also succeeded on the phone; restart after that final rotation
remains to be checked. An
encrypted copy of the old fixture is under `/tmp/notables-wallet-evidence/`.
Preserve notes and all other app data. Never clear or uninstall the app to escape
a migration issue.

Full evidence: [verification.md](../../../../docs/specs/www/0003-digital-card-wallet/verification.md).

## Tools and checks

The shell PATH may not include Bun, Java or adb. Installed locations:

| Tool | Location |
|---|---|
| Bun | `/home/laniina/.bun/bin/bun` |
| adb | `/home/laniina/Android/Sdk/platform-tools/adb` |
| JAVA_HOME | `/opt/android-studio-for-platform/jbr` |
| ANDROID_HOME | `/home/laniina/Android/Sdk` |
| NDK_HOME and ANDROID_NDK | `/home/laniina/Android/Sdk/ndk/30.0.16248370` |

Android builds from `www/` use `bun --bun run tauri android build --debug --apk
--target aarch64`. Include Bun and Java in PATH and set the environment above.
Also set `BINDGEN_EXTRA_CLANG_ARGS_aarch64_linux_android` to
`--sysroot=/home/laniina/Android/Sdk/ndk/30.0.16248370/toolchains/llvm/prebuilt/linux-x86_64/sysroot`.

APK: `www/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.
Native changes can reuse an already current native frontend using
`--config '{"build":{"beforeBuildCommand":""}}'`. Never use that override
with stale frontend assets or assets built for the web target.

Latest evidence: workspace type checks passed, web and Android builds passed,
wallet frontend tests passed (three), native tests passed (40, two ignored), and
the added publication regression test passed separately. Rust formatting and
Clippy passed after the Android fixes. The real Linux key store probe passed.
Full frontend suite had 151 passes and one unrelated publication timeout during
concurrent builds; its nine test file passed on rerun with a longer timeout.
Repository lint has existing skill template formatting and broken symlink issues;
wallet specific lint passed. Other native targets remain unverified.

## Next authorized work when the user resumes

The user clarified on 8 October that Wallet includes their Umeme electricity
card and should scan or read NFC to suggest a card. Bank-only scope is withdrawn.
Seven card kinds now have review selection, corresponding field validation and
kind labels. Electricity recognition suggests meter/account strings without
normalizing leading zeros. Acquisition still requires review before saving.

The connected TECNO reports no NFC feature. Android NFC is capability gated;
read-only NDEF text goes through the same review. The vendored Tauri NFC 2.4.1
plugin includes Android cancellation, pause cleanup, unsigned byte and empty
message fixes. See `www/src-tauri/vendor/tauri-plugin-nfc/WALLET-PATCH.md`.
Do not remove its cancellation fixes on upgrade. No NFC write permission exists.
Successful NFC reads still require a physical supported device and tag.

Finish physical Umeme scan, save and restart evidence. The home is a card stack
and Add starts with camera capture, image import or available NFC. Tesseract
worker, WASM cores and six language models are packaged locally with caching
disabled. Drafts and recognition results clear on cancellation or background.
Back capture, crop, code handling, originals and custom templates remain pending.
Add optional native Passcode, Face ID and Fingerprint only with real capability
probes and authentication bound wrappers.

The feature remains in progress. No build, verification or release milestone
is complete. This repository has extensive preexisting uncommitted restructuring
and app work, plus the wallet additions. Preserve it. Nothing was committed,
pushed or deployed during this wallet session.

_Drafted by /sync from the introducing change, worth a quick human pass._
