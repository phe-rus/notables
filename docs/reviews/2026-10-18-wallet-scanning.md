# Wallet scanning and presentation, 18 October 2026

The owner requested working automatic camera recognition, NFC acquisition and
an Apple Wallet inspired presentation. Existing notes, cards, keys and app data
were preserved. No card values or camera pictures were captured in this record.

## Delivered

- A live camera session processes one frame at a time and keeps its reader
  ready between frames. Two clear readings must agree on a recognized card kind,
  identifier, expiry and holder before opening review. Blank, blurry, conflicting
  and unclassified readings do not capture automatically. The shutter remains
  available for cards outside the automatic recognition rules.
- A local mobile plugin runs bundled ML Kit text recognition 16.0.1 on Android
  and Apple Vision on iOS. Existing bundled Tesseract is reused within a session
  on unsupported targets/languages and older shells. Arabic uses that fallback;
  Chinese retains the earlier English-model limitation. Image imports use the
  same reader and preserve the existing code-reading pass.
- Utility labels accept missing punctuation and values on the next line.
  American Express grouping, printed bank holder suggestions, membership and
  labeled national identity numbers are recognized. Leading zeros are preserved.
- Review starts with the card preview and compact Hino grouped fields.
  Appearance options are secondary. Wallet has a decorative empty state,
  tighter stack, compact circular controls and shared card opening motion.
  Reduced motion disables movement. The vault and optional protection are unchanged.
- Camera tracks and transient canvases are released on completion, cancellation,
  unmount and background. Native results are invalidated on cancellation and
  background. No image file is created by the native reader.
- NFC registration now includes iOS. Its usage description, TAG entitlement,
  cancellation method and local main-window read permissions are included.
  Supported NDEF text enters review; a tag with no readable details gets a
  specific explanation. NFC does not provision payment cards or emulate them.

## Physical Android evidence

Target: TECNO CI6, Android 13, `192.168.1.2:5555`. Both APK installations used
`adb install -r` on `notables.pherus.org.debug` and preserved data.

The first native recognition probe found a cleanup crash: BitmapFactory decoded
an immutable bitmap, and clearing its pixels threw. Decoding now explicitly
requests a mutable bitmap. Three repeated reads through the real native plugin
then returned both synthetic utility identifiers correctly at 87% confidence,
in 425, 161 and 139 ms respectively. These timings measure the recognition
bridge, not total camera capture latency.

The actual camera opened at 2160 pixels wide, with one live track and live
recognition feedback. The owner held a physical card and confirmed: “Yes, the
details appeared.” The app moved to review automatically and removed the video
and camera track. No real card was saved or deleted by the agent.

The add screen was visually checked on the physical phone. Screenshots in
`/tmp/notables-wallet-before.png` and `/tmp/notables-wallet-add-after.png`
show the old review and the new add screen respectively; the earlier before
image contains only an old gibberish recognition draft, not a real card.

## Checks

- Frozen dependency install, root lint, all workspace type checks and tests,
  web build and native frontend prerender passed. Lint retains six existing warnings.
- Wallet tests: 22 passed, including the reproduced extraction failures and
  frame agreement, blur, conflicting identifiers and unrelated text cases.
- ARM64 Android Rust and Kotlin compilation, APK packaging and installation passed.
- Cargo formatting, Clippy with warnings denied and library tests passed:
  50 passed, 2 ignored. Android compilation has existing platform import warnings.

## Remaining boundaries

- Apple Vision and NFC iOS code have not been compiled on this Linux host or
  tested on an iPhone. NFC provisioning must include Tag Reading.
- The TECNO advertises no NFC feature. A real supported device and NDEF tag
  are still required to verify reading and cancelling on Android and iOS.
- The current Chromebook installation has not received this scanner build.
  The next Android distribution must build both ARM64 and x86_64 as usual.
- The owner verified automatic review, not every extracted value, saving or
  reopening a real card. Back capture, source-image cropping, retained originals,
  broader barcode-to-field handling and custom templates remain separate work.
- Before shipping the new Android SDK, reconcile privacy/store disclosures:
  ML Kit processes images and outputs on-device but collects SDK diagnostics,
  including device/app information and performance metrics. Do not claim that
  this dependency has no telemetry or release with an inaccurate declaration.

## Primary references

- [ML Kit Android text recognition](https://developers.google.com/ml-kit/vision/text-recognition/v2/android): bundled model and real-time processing guidance.
- [ML Kit terms and privacy](https://developers.google.com/ml-kit/terms) and
  [Android data disclosure](https://developers.google.com/ml-kit/android-data-disclosure): image processing and SDK diagnostics.
- [Apple Vision text recognition](https://developer.apple.com/documentation/vision/recognizing-text-in-images): native image text recognition.
- [Tauri NFC configuration](https://v2.tauri.app/plugin/nfc/): iOS usage description and NFC entitlement.
- [Apple Wallet](https://www.apple.com/wallet/): visual reference for card hierarchy and presentation.
