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

## Gallery Done regression, later 18 October checkpoint

The combined lifecycle, parser and security debug build was installed on the
physical TECNO CI6 at 192.168.1.3. Real ADB taps selected each approved photo
and confirmed Android's Done button. The electricity photo opened review with
an 11-character meter identifier; the passport opened review with holder,
9-character identifier and labeled expiry. No private values were logged.
Both review forms saved through the UI under temporary QA names.

After force-stop and relaunch, Wallet reported locked. A debug-only grant
allowed verification that both records survived, the utility meter and passport
expiry were preserved, and the passport identifier was redacted. This does not
verify a real biometric success. Eight synthetic cards also exercised native
secret redaction and preservation during public edits. All ten temporary records
were removed by recorded IDs after verifying their QA names. The original debug
wallet had zero records and returned to zero. Owner photos and the store app
were preserved. Card previews measured 328 by 206.91 CSS units, ratio 1.585.

The gallery regression is verified on this debug build. Wallet as a whole is
still in progress: physical back capture, real authentication/cancellation,
iOS compilation and device checks, NFC hardware evidence and release disclosure
review remain. LAN-only Wallet transfer is a design, not an implemented feature.

## Bank-front extraction and card appearance checkpoint

The owner reproduced a failing bank-front import in the physical TECNO debug
app. The recognized text contained Visa, expiry and a grouped number with one
digit missing. The parser required a complete grouping before recognizing a
bank card, so it returned Other and the bank-specific expiry control disappeared.
The revised parser recognizes network names independently, preserves the read
number, marks uncertain lengths/checksums, and excludes expiry labels from
holder guessing. The real recognized text was checked locally with the revised
parser, without logging private values: Bank card, number and expiry were
recovered; holder stayed empty. Live frame agreement does not accept an uncertain
number. Rotated complete readings outrank uncertain suggestions.

All eight kinds now use distinct decorative print and surface treatments with
Hino accent tokens. Type-specific motifs are decorative, not usable codes,
certification seals or payment provisioning. Their proportions remain 1.585.
The combined build installed successfully on the TECNO; eight synthetic card
previews rendered and were then deleted by tracked IDs. The owner’s saved
electricity card was preserved. The owner then reimported the bank front on the new build. Physical review
confirmed Bank card, populated number and expiry, and the uncertain-number
warning. OCR still reads 15 digits on that Visa photo, so the recognition
quality issue remains. Holder and issuer are empty. No bank card was saved.

Back capture now checks meter/account mismatches as well as card numbers and
reports when there are no new fields to add. Physical cancellation and useful
back-field merging remain to be verified. Wallet tests: 43 pass. Workspace type
checks, lint (six existing warnings), full tests and web production build pass.
Native frontend prerender and ARM64 packaging pass.

## Wallet interaction polish for v0.2.6

The native HTML progress bar is replaced with a card-reading activity view. It
does not claim an upload or a percentage that native OCR cannot measure. Camera
and back capture actions are compact; detail rows omit empty fields, copy
controls are small, and unavailable backs do not get a nonfunctional selector.
Presentation uses a constrained card width, one close icon and a side selector
only when there is a back. Edit has a direct Back action to the selected card.
Unlocked navigation and presentation animate with Reduce Motion support. The
animation subtree is removed immediately when access is cleared or locked.

The owner requested a release followed by public beta preparation. v0.2.5 is
the previous tag; v0.2.6 is the next release. Existing CI sends Android to Play
internal and iOS to TestFlight. Opening testing to users still requires Play
open testing setup and TestFlight external testing review/public-link setup.
Store descriptions and disclosures must retain the documented OCR, NFC and
sync limitations.

Final polish checkpoint: workspace lint passed with six existing warnings,
all workspace type/test tasks passed (219 app tests), native frontend prerender
and web build passed, Worker smoke passed, Cargo format/Clippy passed and Rust
library tests passed (53, two ignored). The final debug APK installed on the
TECNO. Synthetic bank opening and presentation open/close were exercised with
real taps. Eight temporary records were deleted by tracked IDs. The owner’s
two saved cards were preserved and Wallet was left locked. No claim of a real
biometric success, complete bank OCR or physical NFC verification is made.
