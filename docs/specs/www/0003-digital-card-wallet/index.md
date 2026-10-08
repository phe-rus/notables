# 0003. Digital card wallet

**Date**: 2026-10-08
**Status**: In Progress

## Current product direction

**Updated 9 October 2026 (supersedes the protection choices below and in
spec 0003):** the wallet uses the same security model as the planned Vault.
Protection stays off by default (passwordless, still encrypted at rest).
When turned on, the choices are PassPin (a short app PIN), a password, and
the device's Face ID, fingerprint or passcode where the device offers them.
Wallet is a phone tab (Notes, Wallet, Invoices, Settings); Books moved to
the sidebar.

Your correction on 8 October 2026 replaces the earlier manual form delivery and
password fallback decisions throughout this spec and its children.

The experience follows Apple Wallet: a stack of cards, a simple add control,
scan or import followed by review, and a focused card presentation. Manual
editing is a correction tool, not the main add journey. Search, sorting and
administrative controls must not dominate the wallet home screen.

Opening a fresh wallet requires no wallet credential. Encryption uses the
native secure store independently of optional access protection. The only
protection choices are Passcode, Face ID and Fingerprint. Passcode uses the
native device credential prompt. Face ID is offered on supported Apple devices;
fingerprint is offered where the native device supports it. Unsupported methods
are visibly unavailable and never become a password prompt. Protection is off
by default. There is no wallet password, password confirmation or password
fallback. An unavailable secure store is an implementation or device capability
issue, not a reason to force protection.

The current phone build does not meet this direction. Its password setup,
manual form and list layout must be replaced before the wallet is accepted.
Password based backup and recovery are also withdrawn; that milestone remains
pending a native protected recovery design within these three methods.

## Summary

You scan a physical card and review its details, then Notables builds a digital card from an editable template. The wallet works offline on native apps and stores its contents encrypted. There is no wallet unlock by default. You can enable Sensitive protection in Settings, Account, to require Passcode, Face ID or Fingerprint where supported.

## Structure

| Document | Responsibility |
|---|---|
| [Capture and templates](0003-capture-templates.md) | Recognition, card records, layouts, rendering and presentation |
| [Vault and protection](0003-vault-protection.md) | Encryption, device keys, optional unlock and access checks |
| [Backup and restore](0003-backup-restore.md) | Deferred native protected recovery, conflict review and atomic import |
| [Rationale](rationale.md) | Decisions, alternatives and verified references |
| [Verification](verify.md) | Release evidence mapped to acceptance criteria |

The children share the acceptance criteria and command contract in this document. They have no independent lifecycle status.

## Requirements

**User stories**:
* You can carry useful digital copies of your cards without carrying every physical card.
* You can correct scanning mistakes and choose how your card looks.
* You can keep the wallet convenient by default and enable access protection when you want it.
* You can recover cards without an online account once the native protected recovery design is approved.

**Acceptance criteria**:
* **AC-1**: On Android, iOS, macOS, Windows and Linux, you can add a card using camera capture where available, image import or manual entry. Permission refusal leaves image import and manual entry usable. The browser shows an unavailable explanation and stores no wallet data.
* **AC-2**: Text recognition runs offline. No image, field, code or recognition result is sent to a server. The user reviews suggested fields and a suggested template, changes either, and confirms before a card is saved.
* **AC-3**: Bank, national ID, electricity, television subscription, SIM, membership and other card kinds have defined fields plus custom labeled fields. Identifiers preserve leading zeros. One card may contain just one side.
* **AC-4**: Saved cards are rendered from details and templates, not a photo used as the card face. Built in templates cover landscape, portrait and compact forms. Appearance changes belong to the card unless explicitly saved as a reusable custom template.
* **AC-5**: You can present a card full screen, switch between front and back, close it by a visible control or Escape, and operate every action with a keyboard or screen reader. Missing sides are identified. Reduced motion removes the flip animation.
* **AC-6**: Supported QR and barcodes are rendered only after the rendered code decodes to the stored format and payload under the preservation rules in the capture child. Unreadable and unsupported codes show a clear state and allow recapture or supported manual entry. A picture never enables payment, official ID verification, SIM activation or NFC emulation.
* **AC-7**: Card fields, codes, custom templates, retained images, recognition drafts and wallet audit events are encrypted on persistent storage. No card content enters ordinary notes, media storage, global search, widgets, publishing, sharing, logs or analytics.
* **AC-8**: A fresh wallet has Sensitive protection off and requires no wallet unlock. Its data key still uses the OS secure store. If that store is unavailable, the app explains the device limitation without forcing a credential or creating a plain key file.
* **AC-9**: Settings, Account, exposes Sensitive protection without requiring sign in. Enabling it offers only Passcode, Face ID and Fingerprint, using native device authentication and its capability results. Protection controls the entire wallet. Changing or disabling it requires current authentication and an atomic key transition.
* **AC-10**: With protection enabled, the wallet locks on application background, OS session lock where available, app exit and five minutes without wallet activity. Locking clears decrypted UI state, presentation and drafts. Rust denies every content command until an authenticated session exists.
* **AC-11**: Bank card numbers show only their last four characters on wallet list previews. Full numbers and optionally saved CVV or CVC are visible on the card detail and presentation surfaces when the wallet is accessible, without an additional reveal step. Saving a CVV or CVC requires a specific choice on that card review. This is personal storage, not payment processing or autofill.
* **AC-12**: Source images are discarded on review completion by default. You can explicitly retain either side encrypted. Cancellation, failed capture and app background discard transient drafts. Deleting a card removes its fields, codes and retained originals together after confirmation.
* **AC-13**: Deferred until a native protected recovery design is approved. Backup content must be authenticated and encrypted, including necessary templates and retained images, while excluding device keys and protection credentials. Failed authentication or modified content changes nothing.
* **AC-14**: Restore previews new cards and matching card IDs before writing. For each conflict you choose keep local or replace from backup. Import is atomic, honors local protection settings, and can be retried without adding duplicates.
* **AC-15**: Card revisions detect stale edits, recognition jobs cancel, and write failures preserve the last committed wallet. Corrupt or newer unsupported vault formats are never overwritten. There is no automatic conversion into ordinary notes.
* **AC-16**: Wallet screens and new Account settings use existing UI tokens, components and optional haptics. All new text exists in six catalogs, Arabic supports RTL, and card numbers and codes retain their intended direction. Controls work with large text and narrow windows.
* **AC-17**: Camera capture, recognition, barcode rendering, OS key storage, optional authentication, background locking and backup restore have recorded target evidence before that target ships the wallet. Mobile project generation and native library packaging are included in the build, rather than assumed complete.
* **AC-18**: Security related operations record bounded encrypted audit events containing operation type, time and outcome, with no card values, passwords or images. Global application logs contain only coarse error codes.

## Decision

**Chosen option**: A native template wallet with an isolated Rust vault, bundled offline recognition, and optional OS assisted access protection. Reuse React, Tauri, SQLite and the existing component system. (basis: the confirmed requirements and ADR 0006)

Use Tesseract.js with bundled worker, WASM core and language data for OCR (reading text from an image), ZXing C++ through the bundled `zxing-wasm` adapter for supported code recognition and rendering, and RustCrypto XChaCha20Poly1305 for encrypted envelopes, with Argon2id retained only to read legacy prototype wrappers during migration. Use OS secure storage adapters and the official Tauri biometric plugin on its supported mobile targets. Exact dependency versions are resolved, pinned and license checked during the first build milestone. No cloud service or new account is required. (basis: verified Tesseract, ZXing, RustCrypto and Tauri documentation, summarized in rationale.md)

**Implementation skills**: [tauri-ipc](../../../../.agentic/skills/tauri-ipc/SKILL.md), [tauri-security](../../../../.agentic/skills/tauri-security/SKILL.md), [tauri-app-biometric](../../../../.agentic/skills/tauri-app-biometric/SKILL.md). Barcode and Stronghold guidance informed the options, but those plugins are not the chosen storage or code engine.

## Feature design

### Boundaries and code ownership

`www/src/features/wallet/{components,lib,model,store}` owns UI and transient view state. `www/src-tauri/src/wallet/{commands,vault,keys,recognition,codes,backup}` owns sensitive persistence and operations. Native OS adapters remain under this wallet area or its Tauri plugin bridge, with target sources beside their platform adapter. `packages/notable-core/src/wallet` may contain pure card and template schemas; it contains no device key or native API. `packages/ultrapeach/ui` stays domain agnostic. Pluraliti does not own the wallet.

Use TanStack Router for navigation, TanStack Form for capture review and editing, and TanStack Store for transient wallet state. Sensitive query data is not persisted by a Query or DB cache. Use a native only `/wallet` route in the private app shell. Add Wallet to the sidebar and a Wallet row under Settings, Account, for phone discoverability. Do not add a fifth bottom tab in this spec. The wallet home has a card stack and a simple Add control. Default order is updated time descending, then ID. Search, sorting and filters do not dominate the home. Presentation hides app navigation and restores it on close. Browser users can read the unavailable explanation, but no native commands or vault initialization run there.

### Shared command contract

All surfaces are typed Tauri invokes, not HTTP endpoints. The main native application window is the only allowed caller. Native code checks its window identity and the Rust session, never a frontend boolean. Every returned error is a typed code, translated at the UI boundary. Content returns only after access checks. Card mutations use UUID operation IDs and expected revision numbers.

| Command | Inputs | Outputs | Access | Main errors |
|---|---|---|---|---|
| `wallet_status` | none | availability, protection mode, locked state, auth capabilities, format version | Local main window | secure store unavailable, unsupported format |
| `wallet_initialize` | device mode only; no user credential | wallet status | No existing vault | already initialized, secure store unavailable |
| `wallet_unlock` | method: passcode, faceId or fingerprint; native prompt only | session generation, expires after inactivity | Protected main window | cancelled, unavailable, invalid credential, throttled |
| `wallet_lock` | none | locked status | Main window | none; safe to repeat |
| `wallet_set_protection` | enabled, method: passcode, faceId or fingerprint; fresh native authentication when changing | wallet status | Fresh current authentication for an existing protected wallet | invalid credential, unavailable, write failure |
| `wallet_capture` | bounded image bytes from camera or picker; side: front or back | transient capture handle, preview | Accessible wallet | cancelled, permission denied, invalid image |
| `wallet_recognize` (local worker) | capture handle, language profile, request ID | candidate fields, code candidates, suggested kind and template, confidence | Accessible wallet | cancelled, timeout, model unavailable |
| `wallet_cancel_capture` | capture or request handle | cancelled status | Main window | safe to repeat |
| `wallet_list` | cursor optional, limit 1..50 default 25, filter kind optional, sort, search text optional | safe card previews, next cursor | Accessible wallet | locked, invalid cursor |
| `wallet_read` | card ID | full card, template version, revision | Accessible wallet | locked, missing, corrupt record |
| `wallet_save` | operation ID, card draft, expected revision or null, retain capture handles | ID, new revision | Accessible wallet | invalid, conflict, quota, write failure |
| `wallet_delete` | operation ID, card ID, expected revision | deleted or already deleted | Accessible wallet | conflict, write failure |
| `wallet_templates` | kind optional | validated template catalog | Accessible wallet | locked |
| `wallet_template_read` | ID and version | immutable template | Accessible wallet | missing |
| `wallet_recover` | authenticated backup preview, explicit replace confirmation | recovered vault status | Main window, no current vault unlock | invalid backup, write failure |
| `wallet_template_save` | operation ID, validated template draft, expected revision or null | template ID and version | Accessible wallet | invalid, conflict |
| `wallet_original_read` | card ID, side | temporary opaque image handle | Accessible wallet | missing, locked |
| `wallet_code_render` (local worker) | card ID, code ID | validated pixel or vector output, render status | Accessible wallet | unsupported, invalid payload, round trip mismatch |
| `wallet_backup_export` | deferred native authentication contract, native destination chooser | saved or cancelled | Accessible wallet, fresh auth when protected | unavailable, no space, write failure |
| `wallet_backup_preview` | native file chooser, deferred native authentication contract | import handle, safe summaries, conflicts, counts | Accessible wallet | invalid credential or corrupt file, unsupported version, quota |
| `wallet_backup_commit` | import handle, operation ID, expected vault revision, conflict choices | added and replaced counts, new vault revision | Accessible wallet | expired preview, conflict, write failure |

`wallet_preview_read(handle)` loads transient preview bytes only for the main window. All handles bind to the current session generation and expire on lock. Capture images use a camera or user selected file in the WebView, with local OCR and code jobs on bundled workers. The native vault validates bounded image bytes if originals are retained. Export and import use native dialogs; JavaScript never supplies an arbitrary filesystem path. Recognition commands describe the typed wallet service interface; local worker operations are not registered Rust commands. See child specs for validation and payload bounds.

### Value sourcing

| Value or action | Source |
|---|---|
| Card ID, field IDs, code IDs, operation IDs | Random UUIDs; a mutation reuses its operation ID on retry |
| Card kinds and predefined field keys | The registry in the capture child; custom labels come from review input |
| Recognized text, confidence and codes | Local engines reading the transient capture handle |
| Stored values, template and optional issuer | User confirmed review input; OCR is only a suggestion |
| Layout, dimensions, side state and style | Pinned template version, per card overrides and the reviewed side choices |
| List summaries and last four | Derived from decrypted card fields in Rust, never a plain stored index |
| Code artwork | ZXing output validated against stored format and payload |
| Created, updated and audit times | Rust system UTC clock in milliseconds; never a security timeout source |
| Revisions and restore conflicts | Committed vault revision and card ID plus card revision, under one write lock |
| Lock interval and available methods | Five minute constant, Rust monotonic activity clock and OS adapter capability probe |
| Language profile | App locale default, changed explicitly in capture; installed bundled OCR models |
| Image retention | Explicit per side review choices; default false |
| Export contents and import counts | A consistent unlocked vault snapshot and verified decrypted backup manifest |
| Native protection credentials | Handled only by the OS authentication prompt, never read by Notables |
| Protection state | Vault header plus committed key wrapper policy; never general preferences alone |
| Search results, filters and page cursors | Decrypted in memory projection of the accessible vault, stable sort and its generation |

### Key invariants

One writer serializes mutations. Records have required ID, revision, created and updated times. No field is silently accepted from OCR. Saving an incomplete side is valid; saving without a display name or a template is not. Unknown card types use `other`, never silently become a bank card. Credentials and keys never enter the app preference store. A failed security transition keeps the previous readable vault and wrapper. Old template versions remain available while referenced. The browser cannot become a weaker wallet implementation by accident.

### Security model

This is a personal card organizer with financial and government identity data. It processes no payment authorization and makes no official credential claim. PCI merchant CVV rules are not asserted as an automatic legal classification of a consumer vault; payment autofill needs separate review in feature 21. CVV retention is explicit and included in encrypted backups when saved. The no unlock default allows anyone using the open OS session to open the wallet. Encryption at rest is not protection against an already compromised device or application process.

See the vault child for authenticated encryption (encryption that also detects alteration), optional unlock, key rotation, audit records and platform gates. Grant wallet commands only to the local main window. Published content, remote webviews, deep links and widget windows cannot invoke content access. Sensitive routes have no public metadata or server rendering.

### Failure and performance rules

List pages contain at most 50 previews. Initial release bounds are 1,000 cards, 100 fields per card, four codes per side, two retained source images per card (each normalized retained image at most 2 MiB) and 500 custom template versions. The encrypted content budget is 32 MiB. Recognition accepts a decoded image of at most 20 megapixels and at most 20 MiB, with one job running per wallet and a 60 second timeout. Work runs off the UI thread. UI shows progress and Cancel. These are product limits, not claims that OCR meets a fixed accuracy level.

No new remote service credentials are required. Bundled assets and native library versions need license records and build checks. Every target fails closed on corrupt ciphertext and unavailable secure storage; manual entry remains available for a failed recognition job after normal wallet access.

### Critical test scenarios

* Manually add a bank card, restart offline, present both sides and edit a field, verifies AC-1, AC-3, AC-4, AC-5, AC-11.
* Capture an Arabic identity card and a Swahili utility card offline, correct OCR results and preserve identifiers, verifies AC-2, AC-3, AC-16.
* Decode and render numeric and binary code fixtures, refuse unsupported formats or mismatches, verifies AC-6.
* Inspect files, SQLite journals, crash output and network traffic for seeded secrets and pictures, verifies AC-7, AC-12, AC-18.
* Enable protection, background the app, reject a direct Rust content invoke, test cancellation and unavailable native methods, verifies AC-8, AC-9, AC-10.
* Change protection mode during a simulated disk failure and relaunch with the previous state intact, verifies AC-9, AC-15.
* Export a backup, alter a byte, reject failed native authentication and resolve an ID conflict without partial writes, verifies AC-13, AC-14, AC-15.
* Exercise every target capability gate, translated UI, keyboard and reduced motion, verifies AC-1, AC-16, AC-17.

## Build plan

The approach is Tracer Bullet: first make scan, review and a card stack work on a real phone with native encrypted storage and no wallet credential, then add optional native protection and recovery. All work remains unbuilt at spec capture.

1. Pin and license check native dependencies, prove secure key storage on Android, iOS and each desktop target, then create an isolated vault and one scan and review flow through `/wallet`, stacked cards, save and presentation without forced protection. Add versioned schemas, limits and the shared invoke contract. Add the iOS project when required and record packaging blockers before accepting a target. Satisfies AC-1, AC-3, AC-4, AC-5, AC-7, AC-8, AC-15, AC-17, AC-18.
2. Build capture handles, permission fallbacks, offline models, recognition review, the remaining card kind templates, appearance edits, custom template versions, retained image choices and validated code rendering. Satisfies AC-1, AC-2, AC-3, AC-4, AC-6, AC-12, AC-15, AC-17.
3. Add Settings, Account, Sensitive protection; platform authentication adapters for Passcode, Face ID and Fingerprint, atomic wrapper transitions, lock events, protected command checks, audit records and CVV retention choices. Satisfies AC-7, AC-8, AC-9, AC-10, AC-11, AC-15, AC-18.
4. Add authenticated backup envelopes, safe native destinations, bounded preview, conflict choices, revision checking and atomic restore. Satisfies AC-13, AC-14, AC-15.
5. Finish six language catalogs, accessibility, RTL, haptics, lifecycle races and all target evidence. Run repository checks plus target native builds and the verification plan. Satisfies AC-1 through AC-18.

## Consequences

**Positive**: Your cards stay offline, editable and independent of an online account. Templates provide consistent digital surfaces without retaining scan photos by default.

**Tradeoffs**: Offline OCR adds language data and native build work. Exact issuer replicas are not promised. Desktop biometrics vary. Encryption does not give access protection while that setting is off. Deletion removes live records but cannot promise physical erasure from flash storage or old backup files.

**Neutral**: This adds a separate native data boundary and encrypted backup format. The first release has no browser wallet, payment capability, NFC emulation, card autofill, public sharing or bank connection.

## Follow-up

* [ ] Feature 21 designs eligible card autofill and contactless behavior separately, including any payment and issuer requirements.
* [ ] Design the requested Settings, bottom navigation and icon refresh as its own slice. This spec changes only wallet discoverability and the Account protection controls.
* [ ] Consider browser support after a separate browser key storage and authentication design.
* [ ] Record wallet IPC, capabilities and biometric conventions in the appropriate wallet context file through `/sync`. No context file is changed by this spec.
* [ ] Reuse the installed Tauri skills. No extra skill installation or MCP connection is needed for this local design; additional discovery can be reconsidered if implementation introduces an external service.

## Rationale

Reasoning, alternatives and verified sources: [rationale.md](rationale.md).
