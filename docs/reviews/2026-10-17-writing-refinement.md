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
- After the owner rejected the initial nested card framing, lists now use one
  rounded group per date section with inset row separators. Gallery follows
  Apple’s iOS 26 reference: three columns, landscape page previews, centered
  titles/dates and actual folder names below, without an outer card or chips.
  The owner then rejected the list’s low contrast and small heading. List mode
  now uses a distinct fill backdrop, white grouped rows, a 34 px folder heading,
  24 px row insets, larger 60 px thumbnails, inline date/preview text and no
  extra kind-label row. New preferences default to one preview line and date
  grouping, while existing custom preview lengths remain adjustable.
  More uses Hino’s 32 px `icon-xs` size and an 18 px icon. Opening a note
  matches only the tapped card to the editor using the router’s native view
  transition, and Back returns to that note. Reduce Motion disables the spatial
  transition; unsupported browsers retain the incoming screen animation.
  Browser evidence: open and return both resolved `ready` and `finished` with
  one named surface and no duplicate-name errors. Reference:
  https://support.apple.com/en-us/118442 (gallery and swipe-delete screenshots).
  Gallery renders a bounded opening page
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
`efebdc69-5891-4428-9c37-50d96b844f18`.
The final card refinement was installed and checked with real ADB taps:
three equal 101.33 px gallery columns, a 32 px More button, and open/return
transitions both reporting `ready` then `finished`. Browser Reduce Motion
verification reports no named spatial surface (`view-transition-name: none`).

An intermediate package failed with `asset not found: index.html` because
overlapping web and native builds replaced the shared frontend output. The
corrected build ran the native frontend and APK sequentially and checked
`dist/client/index.html` before packaging. Keep these builds sequential.

List correction follow-up: installed on the TECNO at 192.168.1.2:5555.
Real ADB taps set Preview to 1 line and date grouping on through Settings,
then selected View as List. The final screen has visible white Pinned/Today/
This Week groups, inset separators, 82 px regular rows and larger media
thumbnails. The folder title respects the phone’s text scale (28.9 px on
this device, 34 px at the default app scale). Type checks, lint, 303 TypeScript
tests, native/web builds and Worker smoke passed.

Owner density correction: reduce normal list rows from 82 px to 68 px minimum,
row insets from 24 px to 20 px, thumbnails from 60 px to 48 px and group corners
from 26 px to 20 px. Titles, previews and section headings use smaller Hino text
styles. The owner rejected the large folder heading: the actual folder name
now sits next to Back, with no duplicate heading. Folder lists omit their own
SearchField because the bottom bar already opens search. Hidden folder search
queries cannot filter the notes. Gallery keeps its three columns.

## Settings and Workspace navigation follow-up

Settings is grouped by intent, with localized headings in all seven catalogs:
Devices & Sharing; Personalization; Writing & Tools; App & Privacy. Rows are
44 px with smaller 26 px icon tiles and inset separators. The profile remains
at the top with the protected space ID, and Connected Devices is immediately
below it in the first group. Existing settings values are retained. Circles moves to Workspace Artifacts;
its old Settings URL redirects to `/connections`.

Appearance uses compact pickers for theme, text size and language, with color
swatches in their own group. Note font moves to Writing, whose controls are
organized into Sorting, Display and Swipe Actions. The ineffective kind-label
toggle is removed. Sidebar settings no longer repeat folder navigation, and
width is desktop-only. Privacy retains the disabled Lock status and real Wallet
link instead of listing multiple unimplemented unlock methods.

A shared mobile Workspace back link now appears in Books, Invoices (including
Receipts), Calendar, Recently Deleted, Settings and Wallet home. Nested Wallet
screens retain their existing back-to-wallet action. Desktop sidebar controls
remain available at their existing breakpoints. Navigation clears folder search
parameters when returning home.

Browser evidence: all visible Settings destination rows measure 44 px, available
group titles are present, no horizontal overflow, and Appearance returns through
Settings to Workspace. Theme/text size/font/sort/order/density use real pickers.
Secure Lock remains unimplemented; no new security guarantee is implied.

Latest owner navigation direction: keep sidebar controls alongside Workspace
back links on the main Books, Receipts/Invoices, Calendar, Wallet, Settings,
Recently Deleted and Circles screens. Circles is a 44 px Artifacts row on
Workspace, not a Settings category. The old `/settings/circles` URL redirects
to `/connections`, whose title is Circles. Browser checks verified both controls,
opening the sidebar, navigating to Settings from its gear, absence of Circles
in Settings, and the old-link redirect.

One existing wallet SSR test needed router context after adding the back link;
its fixture now provides a real memory router, retaining the assertion that
rendering the browser explanation never starts native wallet storage.

Final mobile navigation correction: only Workspace exposes the sidebar toggle.
Books, Receipts/Invoices, Calendar, Circles, Wallet, Settings, Recently Deleted
and note folders use Back plus bottom navigation. Sidebar controls at wider
breakpoints are retained. This supersedes the earlier request for both controls
on the main mobile screens.

The final phone-width browser inventory found one visible sidebar opener on
Workspace and zero on Books, Invoices, Calendar, Circles, Settings, Wallet,
Recently Deleted and a note folder. Back links remain available.

Final installed APK evidence on 192.168.1.2:5555: Workspace has one visible
sidebar opener; Books, Circles and Settings have zero. Workspace return links
work, and Settings is left open for the owner’s review. All 303 TypeScript
tests, root type checks/lint/build, native frontend build, Worker smoke, Rust
formatting/clippy and 49 Rust tests passed (two model tests remain ignored).
