# Rationale: digital card wallet

## Context

You want rendered digital versions of physical cards, with editable details, multiple templates and front and back presentation. You chose a wallet that requires no unlock by default, while Settings, Account, can enable Sensitive protection. You confirmed encryption at rest, local recognition, native apps first and a separate password protected backup.

This feature belongs to `www` and the shared packages already serve that app. Android has a generated project; iOS does not yet have a proven wallet target. Existing note and media persistence is unencrypted ordinary application storage, so it is not the wallet storage contract. Your later instruction chooses TanStack for application capabilities and authorizes implementation and recommended decisions without more selection rounds.

A digital visual copy is not an issued credential. Scanning a bank card or SIM does not reproduce a payment token, secure chip or identity verification process. Exact bank or government artwork and logos require appropriate assets and rights; generic editable templates meet the first release goal.

## Options considered

### 1. Images with manually entered details

The simplest organizer stores photographs with labels. It has fewer rendering decisions, but does not meet your requirement for reconstructed digital cards. (basis: your template requirement)

### 2. Local template wallet with optional protection

Recognition supplies draft values, review confirms them, and an encrypted native vault stores cards and templates. It is private and works offline, but adds encryption, OS adapters and bundled recognition assets. This is the chosen option. (basis: ADR 0006 and verified Tesseract, ZXing, RustCrypto and Tauri documentation)

### 3. Cloud recognition and synced credential service

Managed services can improve recognition and account recovery, but add remote processing of sensitive images, network dependence and server operation. Those tradeoffs do not fit your current local wallet requirement. (basis: your on device recognition and no account choices)

## Rationale

Use the existing Start and Router stack, TanStack Form for editing, and TanStack Store for transient state. Their responsibilities stop at the application layer. A reactive data store is not a secure key store or an OCR engine. Avoid a persisted TanStack query cache or DB collection containing decrypted wallet values. (basis: TanStack Form and Store official docs)

Tesseract offers language data for Arabic and Swahili as well as the Latin languages. Native Apple Vision and Android ML Kit are credible alternatives, but have different language and OS coverage. Bundling Tesseract through its JavaScript WASM adapter makes the offline asset requirement common across the native WebViews. It increases installer size and requires accuracy tests on real cards. ZXing provides a code format catalog, but decode and write support differ; byte preservation is verified rather than assumed. (basis: official Tesseract language documentation, Tesseract.js local installation guide, ML Kit language tables, Apple Vision and ZXing documentation)

RustCrypto authenticated encryption and a password KDF separate data encryption from unlock policy. OS secret stores offer convenience, with platform specific failure states. The official Tauri biometric plugin supports mobile targets, not uniform desktop biometrics. Stronghold is a useful secret vault alternative, but does not eliminate the decision about device wrappers and optional authentication. (basis: RustCrypto docs, keyring backends and official Tauri plugin platform matrix)

CVV handling here is an explicit personal storage choice. PCI SSC guidance describes prohibited merchant retention after authorization; this spec does not assert that a personal organizer automatically has the same classification. Future payment processing or autofill needs its own applicability review. Do not claim PCI certification or generic NFC replication. (basis: PCI SSC card verification guidance)

## References

**Project sources**:
* `docs/adr/0006-device-first-peer-sharing-optional-backup.md`.
* `www/src-tauri/src/storage/database.rs`, the existing SQLite pattern.
* `docs/scope/www/scope.md`, feature 20 and the separate feature 21.

**Practices**: authenticated encryption, explicit permission handling, atomic writes, bounded untrusted input and separation of data encryption from access protection.

**Verified official links**:
* [TanStack Form](https://tanstack.com/form/latest/docs/framework/react/quick-start).
* [TanStack Store](https://tanstack.com/store/latest/docs/framework/react/quick-start).
* [Tesseract language options](https://github.com/tesseract-ocr/tesseract/blob/main/doc/tesseract.1.asc).
* [Tesseract.js local assets](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md?plain=1).
* [ZXing C++](https://github.com/zxing-cpp/zxing-cpp).
* [ZXing WASM adapter](https://github.com/Sec-ant/zxing-wasm).
* [Apple Vision](https://developer.apple.com/documentation/vision/recognizing-text-in-images?changes=_1&language=objc).
* [ML Kit language coverage](https://developers.google.com/ml-kit/vision/text-recognition/v2/languages).
* [RustCrypto Argon2](https://docs.rs/argon2/latest/argon2/).
* [RustCrypto XChaCha20Poly1305](https://docs.rs/chacha20poly1305/latest/chacha20poly1305/).
* [Keyring backends](https://github.com/open-source-cooperative/keyring-rs/blob/main/Cargo.toml).
* [Tauri plugin target support](https://github.com/tauri-apps/plugins-workspace).
* [PCI SSC card verification guidance](https://www.pcisecuritystandards.org/faqs/are-merchants-allowed-to-request-card-verification-codes-values-from-cardholders/).

## TanStack preference

The user requested TanStack ecosystem components wherever they fit. The wallet
uses the existing Start and Router, TanStack Form 1.33.5 for editable review, and
TanStack Store 0.11.2 for transient state. Store uses createStore and useSelector
from the installed API. No persisted query cache contains wallet content. OCR,
barcode handling and native cryptography remain specialized platform adapters.
