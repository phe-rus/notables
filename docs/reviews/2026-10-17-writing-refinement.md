# Writing refinement, 17 October 2026

This follows the owner's hands-on rejection of the first writing checkpoint.
The request is about coherent folder navigation, useful controls and smoothness,
not simply exposing more features. It supersedes the earlier checkpoint's
scanner and home-screen descriptions.

## Changes

- Workspace is the home screen, showing folders with counts and a recent title
  snippet. A folder opens only its notes. Folder menus rename, reorder and
  safely delete; existing folder contents are preserved. Artifacts sits below
  folders on the home screen. The owner removed Artifacts from the sidebar.
  The phone tab opens Workspace.
- The owner refined the folder rows to 48 px and Artifacts/Recently Deleted to
  44 px, with smaller icons and no Workspace row chevrons. Recently Deleted has
  a soft danger background and red label/icon in the home and sidebar. Trailing
  action menus now request trailing-edge alignment instead of flipping from
  the button’s leading edge.
- Note lists have bounded, inset cards. Gallery renders a bounded opening page
  from actual headings, paragraphs, checklists, tables and adjacent images,
  rather than using only a photo. Older notes are indexed without changing their
  edited dates. Folder names drive headings and the editor back label. More is
  a default button; the separate compose icon is removed and creation choices
  stay in More. View, sort,
  selection, attachment and creation menus use design-system icons.
- The editor uses a horizontally scrollable strip of 44 px controls with equal
  alignment. Popovers remain outside the scroll surface so they cannot be clipped.
  Share and More remain in the header; reading aloud and publishing move into More.
- Multi-photo selection inserts adjacent nodes at half width, with no intervening
  paragraphs. The node container owns sizing in both the editor and read-only view.
  Single images keep their full-width default.
- A live camera scanner replaces the file-picker-only note scan. Captures have
  page review, remove/retake and up to ten pages. Document scans become a PDF.
  Text scans use document segmentation, skip card barcode work and allow editing
  recognized text before insertion. Importing images is a separate camera action.
- Wallet acquisition uses aligned camera, image and NFC rows with icons. NFC is
  visible but unavailable with an explanation when the hardware probe fails.
- Link previews use the stable `/api/link-preview` endpoint, including CORS for
  packaged apps, bounded requests and the existing public-URL checks. Failures
  leave the insertion form open with a retryable error. A hostname-only card
  displays the hostname once. The endpoint is deployed on notables.pherus.org.

## Performance findings

Every note edit previously rebuilt the folders snapshot, invalidating the
workspace tree even though the folders had not changed. Folder snapshots now
retain identity during note edits. A regression test checks this and verifies
that repeating unchanged metadata emits no library update.

Phone detail screens no longer keep the hidden notes list mounted. List rows
no longer run layout animations for every metadata change. Formatting hooks
reuse their state when the actual formatting has not changed, instead of
updating both toolbar instances on every selection event.

These remove unnecessary work. They are not evidence that all sources of lag
are gone, or that the app has reached Apple Notes performance parity.

## Evidence

- Browser at phone size: Workspace and folder navigation, scroll strip 350 px
  wide with 650 px of controls, all 14 controls 44 px high; Insert had 13 actions
  and 13 icons. Two photos had the same y coordinate and adjacent x coordinates.
- Camera flow with Chromium's synthetic camera: live preview, capture, page
  review and insertion of a valid PDF attachment.
- Link insertion: Pherus title, description and image. The deployed endpoint
  returns all three; before deployment that path returned 404.
- Physical TECNO: rear camera opened at 1080 by 1920. Synthetic electricity-card
  OCR reached review in 19.6 seconds with 94% confidence and preserved the meter
  and account's leading zeros. No card was saved. This tests the OCR pipeline,
  not accuracy against a photographed real card.
- Frozen install, lint, type checks, 303 TypeScript tests, web/native prerender
  builds, Worker smoke, native formatting/clippy and 49 Rust tests passed.
  Two model-dependent Rust tests remain ignored.

## Boundaries

Automatic document edge detection, perspective correction and automatic shutter
are not implemented. The camera uses an explicit framing guide and manual capture.
NFC chip reading cannot be verified on the TECNO because it reports no NFC hardware.
Secure Lock, public person IDs, physical iPhone checks and native-to-native media
remain open from the earlier checkpoint. View Attachments still filters notes.

The corrected debug APK is installed on the TECNO at 192.168.1.3:5555. Its
WebView opens Workspace from packaged resources, with four 48 px folder rows
and no development-server requests. Real ADB taps opened Writings and More;
gallery shows the actual content of both notes and More offers View as List.
The separate compose button is absent. The web is deployed as Worker version
`2259f151-2bf8-4271-8a4f-97dfab52197b`.

An intermediate package failed with `asset not found: index.html` because
overlapping web and native builds replaced the shared frontend output. The
corrected build ran the native frontend and APK sequentially and checked
`dist/client/index.html` before packaging. Keep these builds sequential.
