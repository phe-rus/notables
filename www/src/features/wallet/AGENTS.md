<!-- Latest release repair: see docs/reviews/2026-10-18-release-startup.md. -->
# Wallet context and resume checkpoint

## iOS Face ID repair, 19 October 2026

The owner confirms Face ID appears, then Wallet stays locked. Tao 0.37.1 sends
Suspended when iOS resigns active, but Focused(true) when Face ID closes; it
need not emit Resumed because the app never entered the background. The shared
native focus handler now restores iOS foreground state on Focused(true).
Android still uses Activity resume/JNI, and desktop focus behavior is preserved.
A native regression reproduces Locked before the repair and passes afterward.
Focus alone does not grant authentication, extend grants or reveal secret fields.
Physical iPhone verification remains owed after the next TestFlight build.
The misleading legacy password hint is replaced in all seven catalogs.

## Current work, 18 October 2026, not yet complete

The owner's latest security requirements supersede the historical optional
protection rules below and older spec 0003 wording. Wallet requires native
device authentication. It starts locked after process restart; an unlock lasts
30 minutes by default, adjustable in native Privacy & Security. Sensitive
fields require another unlock for five minutes. Returning from a picker or
another app within that grant must not require authentication again. Full app,
note, folder, book and calendar locks are separate policies, off until enabled.

Wallet stays per device, absent from the browser, and outside ordinary space
sync. Optional transfer to selected native devices must require source approval
and a verified direct LAN path. That transfer and remote approval are not built.
The source approval design is in the spec 0005 amendment.

Physical TECNO now uses `192.168.1.2:5555`. ChromeOS is
`100.115.92.2:5555`. Addresses change. Verify `ro.product.model` is `TECNO CI6` before every
install or interaction; never infer identity from an old IP or an open ADB port.

The owner authorized a development unlock so testing can continue while they
rest. `wallet_development_unlock` has its unlock body compiled only when Rust
debug assertions are enabled. Release builds return Denied. It has no product
UI. Its optional `sensitive` argument controls the separate development secret
grant. Never use this command as evidence that real biometrics succeeded.

Uncommitted work includes field masking at the native boundary, preserving
masked fields while saving public edits, front/back capture, Hino swatches and
switches, compact inputs, and fixed card proportions. Three authorized gallery
photos reached review on the TECNO. Preview measured 328 by 206.91 CSS units.
The first photo has no usable identifier; clarification about fronts and backs
is pending. The utility photo needs orientation fallback; the passport exposed
bilingual label and expiry mistakes, corrected in the parser and checked
against its recognized text locally without logging private values.

Android picker testing exposed lifecycle and late event races. Native activity
callbacks now feed `WalletActivityState`, queried through JNI. Tao's NDK context
is an Application, not an Activity. Desktop focus events must not drive mobile
Wallet state. Import waits for native access to resume. The combined parser/orientation and security build is installed on the TECNO.
Selecting the approved electricity and passport photos and tapping Done opened
review on both. The utility meter, passport number, holder and labeled expiry
were filled. Both were saved with temporary QA names, survived process restart,
and reopened with the passport number masked. Restart began locked. All ten
QA records, including eight synthetic cards, were deleted by recorded IDs;
the debug wallet returned to its original zero cards. No photos or store app
data were removed. Real authentication, cancellation and back capture still
need full physical checks; the debug grant is not biometric evidence.

The owner clarified some gallery images are backs. Back merging now checks
meter/account identifiers too and reports no new details rather than marking
an empty back complete. A later bank-front review was inspected on the TECNO:
Visa and expiry were read, but OCR missed a digit, so the old strict grouping
rejected the number and misclassified the card as Other. The revised parser
preserves partial grouped numbers, independently recognizes the bank type,
flags uncertain lengths/checksums, and does not auto-accept them from live
frames. It excludes expiry labels from holder guessing. Checked against the
actual recognized text locally; no private values logged. Distinct card print
for all eight kinds is implemented, with Hino token colors. The latest ARM64 build is installed on the TECNO. Eight synthetic card
previews rendered with the new print; all retained the 1.585 aspect ratio.
Those eight records were removed, preserving the owner’s one saved electricity
card. The owner reimported the failing bank front on this build. Physical review
confirmed Bank card, filled number and expiry, and the uncertain-number warning.
OCR still reads only 15 digits from that Visa photo; do not call recognition
complete or invent the missing digit. Holder and issuer remain empty. The
review was left unsaved on the phone. Next improve number-region recognition
and verify it against this photo; the classification regression is fixed. Wallet tests: 43 pass;
workspace type checks, lint (six existing warnings), tests and web build pass.

Wallet polish for v0.2.6: local-reading activity replaces the native progress
bar, compact capture actions and detail controls, front/back controls only when
available, animated unlocked navigation/presentation with Reduce Motion, and
proper Back navigation from Edit. The animation host unmounts immediately when
Wallet becomes inaccessible, so exiting animations cannot retain locked cards.
The owner authorized committing, deploying and tagging v0.2.6, then reviewing
Play Console drafts and preparing public-user beta listings and screenshots.

Next: finish Wallet and remove only temporary records created for tests. Preserve
the owner's photos, existing cards, notes and both installed app data sets.
The owner’s latest order is v0.2.6 commit/deploy/release, then review Play
Console drafts and prepare external-user beta metadata and screenshots.
Circles and broader app cases remain queued after that checkpoint.

## Previous committed checkpoint, 18 October 2026

The owner confirmed automatic camera review on the physical TECNO with the
updated debug APK, installed with data preserved. Card capture now owns a
live recognition session: bundled native ML Kit on Android, Apple Vision
implemented for iOS, and a retained bundled Tesseract fallback. Agreement
between two clear frames opens review; saving remains explicit. Review starts
with the card and compact grouped editable rows. Keep this design and the
existing vault, keys and protection behavior.

Native reader: `www/src-tauri/plugins/tauri-plugin-card-reader`. Frames are
bounded, transient and never written to disk. Android decoded bitmaps must
be mutable for secure cleanup: erasing an immutable bitmap crashed the first
physical probe, now fixed and checked with three repeated native reads.
NFC is registered for Android and iOS with read-only permissions, iOS usage
description, build-time TAG entitlement and cancellation. It imports NDEF
text, not arbitrary payment-card chips. The TECNO has no NFC hardware.

All repository checks passed. iOS compilation/phone evidence and physical NFC
evidence are still owed. Before an Android release, reconcile ML Kit SDK
diagnostic collection with store disclosures. Details and measured evidence:
`docs/reviews/2026-10-18-wallet-scanning.md`. Older checkpoints below describe
the earlier implementation and do not supersede this checkpoint.

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
Android probe passed on the physical phone. iOS uses the Keychain through
keyring's apple-native backend (device only, never iCloud; 16 October), not
yet run on an iPhone. The space's root secret shares this store. Fresh setup
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
The connected phone was the owner's TECNO CI6 (Android 13).
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
reopened after a full process restart without a credential. The final migration implementation also rotates
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

Latest polish checks: 219 app tests pass, all workspace tasks pass, native
frontend and web builds pass, Worker smoke passes, Cargo format/Clippy pass,
53 Rust tests pass (two ignored). The combined debug APK installed on the
TECNO with data preserved. Real taps exercised opening a synthetic bank card
and opening/closing presentation. Eight QA cards were removed by exact tracked
IDs. The owner now has two saved cards, bank and electricity; both were
preserved. Wallet was left locked. No private photo or values were logged.

## iOS Face ID follow-up, 19 October

v0.2.8 still failed on the owner's iPhone. Two reproduced paths are repaired:
legacy Tao iOS lifecycle has no become-active notification after Face ID, so
Wallet now queries UIApplication state on the main thread; the frontend also
keeps its authentication guard through status application and first card load,
so a late authentication blur cannot erase that result. Subsequent blur still
clears cards. Foreground activity never grants authentication by itself.

All required workspace and native Linux checks passed: 220 app tests and
56 Rust tests, with two expected ignored tests. The UIKit adapter requires
macOS CI compilation and physical Face ID verification in ios-v0.2.9.
Do not describe the physical iPhone issue as resolved before that check.

## Physical Face ID confirmation, 19 October

The owner installed TestFlight 0.2.9 (10022) and explicitly confirmed:
"Wallet now stays open" after Face ID. iOS CI compiled the UIKit adapter and
uploaded the build successfully. Export answers were submitted with the
owner's confirmation; the existing internal group lists the build as Testing.
The reported immediate relock is now physically verified as resolved.

## 19 October: iPhone scanner and NFC follow-up

The owner confirmed Face ID keeps Wallet open on 0.2.9 (10022), then reported
that live camera scanning does not extract details and NFC closes and relocks
Wallet. NFC native sheets can blur the WebView and suspend the native vault.
The pending system-prompt guard is distinct from authentication: it defers
transient blur/locked/poll events, then checks native access after the sheet.
Real document hiding, expired access and manual locking still clear access.
Camera permission setup uses the same guard and checks access before scanning.
The three NFC regressions cover successful return, real backgrounding and
expiry. Physical iPhone camera/NFC verification is still required. Do not claim
the OCR report is solved just because the permission lifecycle is guarded.

The owner clarified that live capture succeeds but bank-card review is empty.
CardCamera now shows detected type, holder/expiry and masked identifiers live;
manual capture stays scanning when neither OCR nor barcode text yields usable
card fields, instead of opening an empty form. Automatic capture still requires
two clear agreeing frames. Generic document captures keep accepting plain text.
The engine's accuracy on the owner's iPhone bank card remains unverified.

Vision-specific bank parser follow-up: its native reader joins individual text
observations with newlines. Printed PAN groups on separate lines were ignored;
a labeled number could also keep only the first four-digit group. The parser
now recognises wrapped groups in bank context and prefers the complete printed
PAN. Synthetic Visa and Amex tests cover group wrapping, expiry separation and
labeled truncation. This is not yet a physical iPhone accuracy confirmation.

## 20 October: form maintenance

ManualCardForm owns form state and submission. model/types.ts owns its props,
form values and draft context; card-form-defaults.ts owns initial values and
kind fields; build-card-draft.ts assembles preview/save payloads with stable
field IDs. CardAppearanceSheet owns the Hino swatch presentation. New draft
regressions preserve masked fields/custom details on public edits and remove
CVV when retention is disabled. Compact inline inputs remain intentionally
unchanged until Hino supplies an appropriate inline field control. Continue
scanner lifecycle and native contract cleanup; this structural pass does not
establish physical OCR/NFC accuracy.

## 20 October: scanner ownership

CardCamera renders only the preview and controls. useCardCamera binds the video,
visibility and Wallet access checks to createCardCameraSession. That session owns
one stream, frame and timer. Stop is idempotent; late camera grants release their
tracks without resuming access or stopping the reader again. OCR/barcode results
after stop are discarded. Frame-capture exceptions enter the normal retry path.
Source clearing checks stream identity so an older session cannot detach a newer
preview. Back captures retain their existing manual/plain-text acceptance rules.

Native OCR calls live in lib/native-card-reader.ts and validate through
model/card-reader-contract.ts before parsing card details. Wire commands and
mobile plugin implementations are unchanged. Scanner contracts and suggestions
are export type declarations in model/types.ts. Details, stability and strength
rules have separate named modules. Continue import/store and Rust vault contract
cleanup, then physical iPhone scanning/NFC verification. No biometric bypass or
new authentication grant is introduced by this refactor.
