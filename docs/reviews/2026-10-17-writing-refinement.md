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


## Latest owner direction: Personal, Finances and ChromeOS

This section supersedes the earlier Artifacts labels and mobile back-link list.

- Workspace has a smaller title, synced folder accent colors from Hino, and
  Personal below folders. Personal includes Books, Wallet, Calendar, Finances
  and Circles. The sidebar remains focused on folders. Wallet, Finances and
  Settings are tab destinations and omit the mobile Workspace back arrow.
- New Note replaces the parent popup with note formats and Back. It no longer
  expands every format in the first menu. The actual note title is visible in
  the editor header on wide screens too.
- Newly opened blank notes are local library drafts. They do not enter folder
  counts, lists or peer library sync until text, media or spreadsheet content
  exists. Existing saved notes are not deleted when cleared. The editor's working
  document can still be persisted separately; this is not a claim that blank
  working-document bytes are never written to disk.
- Read-mode checkboxes update the document without making it editable or
  opening a keyboard. Mouse taps also enter editing on touch-capable desktops.
- Finances now includes one derived ledger of existing invoices, receipts and
  quotes alongside confirmed income/expense records. Its spreadsheet export
  preserves currency and minor-unit precision. It does not infer paid status
  from invoices or quotations or add currencies together. Personal use needs
  no business profile; tax IDs remain optional.
- Receipt acquisition uses the existing live scanner or imported images, then
  local OCR with review. Source images are saved as media on confirmation.
  Pasted mobile money messages suggest explicit amounts and references;
  balance-only messages do not become payment amounts. Repeated messages or
  references are refused locally. Automatic inbox monitoring and concurrent
  cross-device import deduplication remain future work.
- Real web pairing: the in-app Chromium browser linked to the TECNO, the
  Chromebook connection test note arrived on the phone and the phone's Tasks
  note arrived in the browser. The owner continued navigating both interfaces.
- ChromeOS Android: the Dell Latitude 5400 Chromebook Enterprise accepts ADB
  at 100.115.92.2:5555. ARM64 is advertised but the ARM debug build crashes in
  libhoudini on startup. A native x86-64 Android build reaches onboarding and
  the full app. The old org.pherus.notables.debug installation is preserved.
- Reproducible native x86 build: scripts/android/chromeos.ts downloads the
  official Microsoft ONNX Runtime 1.28.0 AAR, checks its pinned SHA-256, extracts
  x86_64/libonnxruntime.so and passes ORT_LIB_PATH/ORT_PREFER_DYNAMIC_LINK to
  Cargo. It packages that shared library; no natural voice stub is substituted.
- ChromeOS adaptation: explicitly resizable activity, maximized landscape
  desktop launch preference, native user-agent platform marker, physical keyboard
  capability, protected window caption, and adaptive wide welcome layout.
  Android transport/storage and scheduled notifications remain available.

Validation: root lint (four existing warnings), all package typechecks,
309 TypeScript tests, web and native frontend builds, Worker smoke routes,
Cargo formatting/clippy and 49 Rust tests (two downloaded-model tests ignored).
Physical device verification continues below this checkpoint. Background SMS,
iPhone keyboard testing and the broader earlier parity backlog are not complete.

Sources: [ChromeOS window management](https://developer.android.com/develop/devices/chromeos/learn/window-management),
[ONNX Runtime Android packages](https://onnxruntime.ai/docs/install/),
[Android SMS permissions](https://developer.android.com/guide/topics/permissions/default-handlers),
[Apple message filtering](https://developer.apple.com/documentation/identitylookup/sms-and-mms-message-filtering).


## Settings and real-device checkpoint

- Confirmed native sync in both directions between the TECNO and ChromeOS
  Android debug apps: ChromeOS sync check was created on the Chromebook,
  arrived on the TECNO and its phone edit arrived back on the Chromebook.
  The test note remains for the owner to inspect.
- Installed store and debug apps had the same launcher name. Both installations
  and their data are preserved; debug builds now use Notables Dev.
- Devices keeps authenticated peer history per space, including offline status
  and last seen. Browser sessions remain separate. Profile uses masked identifiers
  with Show and Copy actions, with different explanations for space and device IDs.
- A standalone two-pane Settings redesign, compact navigation and inline name
  row were rejected by the owner. Reverted those layout changes and restored
  the prior web deployment. The clean fixture screenshots did not prove the
  real linked-browser experience, which was stuck connecting with no profile
  loaded. Do not use the temporary settings APKs built before the revert.
- ChromeOS caption back is suppressed with the documented activity preference.
  Theme primary colors provide the startup caption, and the bridge receives an
  opaque RGB color resolved from Hino's sidebar surface whenever appearance changes.
  Window resizing stays enabled; ChromeOS owns its phone/tablet/resize controls.
- External web, email and phone links use the native opener; internal navigation
  remains inside Notables. ChromeOS Widgets offers Today when the launcher cannot
  pin Android widgets. Native iOS widgets remain unfinished.
- Clean fixture rendering checks passed but were insufficient evidence for
  the real linked-browser and native Settings experience. Visual completion
  remains unverified; the owner rejected that checkpoint.

ChromeOS caption reference: [Optimize for ChromeOS](https://developer.android.com/develop/devices/chromeos/learn/optimizing).


Owner clarification: Settings navigation on the website was already right. The
requested refinement concerns component usage in phone, tablet and ChromeOS
apps, not a new page layout. Keep the existing navigation and panes. Native
Settings group density and the inline name field are scoped by the Tauri marker.
Connected Devices uses a plus icon beside its title, opening only Scan or enter
code and Show pairing code. The instruction blocks and full-width actions are
removed. Browser sessions are labelled Linked Browsers; Log Out uses Hino's
existing destructive variant at xs size, preserving its own confirmation and
never deleting notes. Roles distinguish host devices, linked browsers and synced
apps. Browser logout and leaving the current device work; remote removal of a
full-copy app still needs spec 0005 step 7, including root-secret rotation. Do
not substitute hiding a row or a local block for access revocation.


Final checkpoint before push

- Owner rejected placing Personal beside folders. Restored the exact pre-column
  container from 6856e48: mx-auto flex max-w-[800px] flex-col gap-5. No side grid
  or guessed narrower width remains. Folder colors and authorized Personal
  destinations remain available.
- Web Settings navigation is retained. The real linked browser showed Linked
  Browsers and the xs destructive Log Out control, and later reconnected with
  the person's actual name and library. Do not count its earlier connecting
  screen or a fresh fixture as successful connection verification.
- Both native debug packages were updated as Notables Dev. Real TECNO touches
  verified the header plus menu with the two options, this-device Disconnect
  menu, native Linked Browsers destructive buttons, and persisted Chromebook
  history changing from Online to Last active while the Chromebook app stopped.
- ChromeOS uses native x86-64; the runtime task description received its Hino
  surface color. Its OS caption controls were not visually verified outside ARC.
- Remote Disconnect remains unfinished. It must be offered for the other device
  on BOTH linked apps, targeting that device rather than the one running the UI.
  Existing disconnectThisDevice is not that implementation. Spec 0005 step 7
  requires removal and root-secret rotation, including remaining offline peers.
- Web deployment after the exact Workspace restore: efad6632-b043-4353-aa23-e44b1d1c7519.
- Validation: frozen install, full root lint/typecheck/test/build, native frontend
  prerender, Worker smoke and desktop Rust checks passed during this checkpoint.
  309 TypeScript tests and 49 Rust tests passed; two model tests are ignored.
  Both Android architectures built and installed. Latest Workspace rollback is
  in source/web; Chromebook packaging is being refreshed from that frontend.


Owner's final width correction: the old 800px cap still felt too wide. Workspace
keeps folders and Personal stacked, capped at max-w-md (448px) at the owner's
current web window. Larger caps follow the available Workspace container,
excluding the sidebar (a container query, not window breakpoints): 512px from
1024px of content width, 576px from 1280px. Phones naturally fit their
narrower content width. This supersedes the earlier container-width checkpoint.
