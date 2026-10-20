# Wallet scanner maintenance, 20 October 2026

## Change

CardCamera renders the viewfinder, status and Hino controls. useCardCamera owns
React/video/visibility binding. createCardCameraSession owns startup, the stream,
frame, retry timer and cancellation. Model types own suggestions, readings and
scanner contracts. Detail acceptance, stability and rotated-reading strength
have separate named modules. Native calls have a dedicated adapter and bounded
response schema; plugin command names and mobile wire implementations are unchanged.

The session fixes two lifecycle weaknesses: a late camera permission grant no
longer repeats reader cancellation or refreshes Wallet access after cancellation,
and captureCardFrame exceptions follow the retry path instead of escaping it.
Stop clears detected content and frame dimensions. Source detachment checks
stream identity so an older session cannot disconnect a newer preview.

Existing behavior remains: one frame at a time, two agreeing frames for automatic
capture, logo-only front images stay out of review, back/manual captures accept
plain text, and permission sheets reconcile native Wallet access before reading.
No authentication grant, biometric bypass, card persistence or sync policy changes.

## Verification

The 69 Wallet tests pass. Twelve camera lifecycle cases cover late permission,
OCR, barcode, access-check and playback completion; repeated stop and start;
frame retries; one-frame scheduling; manual back capture; empty manual front
capture; and release before review. Two native contract cases check valid and
malformed/oversized/non-finite responses. Existing parser, masking, Face ID and
NFC lifecycle regressions remain green. Tests use synthetic data and controlled
resource boundaries, not personal card photos or a native unlock bypass.

Workspace frozen install, lint, typechecks and 404 TypeScript tests passed, as
did the web build, Worker smoke, native Linux frontend build, Rust formatting
and Clippy. Rust library tests passed: 56 passed, two existing ignored. Native plugin sources were read for their response format but were
not modified; no Swift/Kotlin compilation or physical OCR/NFC claim follows.

## Next

Continue Wallet import/store and native vault contract restructuring. Physical
iPhone live OCR/NFC accuracy still needs verification. The TECNO remains reachable
at 192.168.1.2:5555; installed mobile apps need the next native build to receive
this source change. No store release or web deployment was initiated in this stage.
