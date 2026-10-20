# Working on Notables

Read this first. It is the handover for any session, on any device. Keep it
current: when you finish something, update **Status** and **Next** below.

## The project

Notables is a local-first app for notes, journals, stories, books, comics,
audiobooks, invoices and plans. One codebase ships everywhere:

- `www/`: TanStack Start app (React 19, Tailwind v4, motion/react) on
  Cloudflare Workers (D1, R2), and the frontend of every Tauri target.
- `www/src-tauri/`: Tauri 2 shell for iOS, Android, macOS, Windows, Linux.
  Rust core: SQLite storage, media files, on-device Whisper, file export,
  widgets.
- `packages/notable-core` (models, invoicing, calendar recurrence), `packages/pluraliti`
  (custom Lexical editor), `packages/sync` (Yjs persistence, peer-to-peer
  mesh), and Hino (`@phe-rus/hino`), the Pherus design system, which
  replaced UltraPeach on 15 October (source in `~/pherus/hino`, rules in
  the `hino` skill): components, Hugeicons and design tokens
  (`@phe-rus/hino/tokens`, `theme.css`). Blush pink is the default.
- The app package in `www/` is named `notes`; the repo root is `notables`.
- Decisions live in `docs/adr/`; read ADR-0003, 0005 and 0006 before
  touching sync, identity or sharing.

Code is organised by feature: `www/src/features/<feature>/{components,lib,store,model}`.
Shared app components are in `www/src/components`, platform glue in
`www/src/platform`, translations in `www/src/i18n`.

App imports crossing feature boundaries use `@/`; short relative imports stay
inside their owning module. Feature contracts and component props live in an
owned `types.ts`, using exported type aliases. Use Hino controls where available;
hidden file inputs and specialised capture primitives are legitimate exceptions.
Keep private helpers together when they serve one responsibility. Avoid global
barrels and generic utility dumping grounds.

## House rules (from the owner)

- Commit and push straight to `main`, with clear, professional messages.
  No pull requests unless asked.
- **Never use em dashes**, in app text, code, comments, docs, commits or
  replies. A test enforces it (`www/test/style/no-em-dashes.test.ts`).
- Organised code, no flat dumping grounds, no filler. Match the
  surrounding style and comment density.
- Apple-like, premium, system-aware UX: respect the OS, its settings and
  its conventions on every platform.
- Every user-facing string goes through `t()` from `www/src/i18n/i18n.ts`;
  add new keys to all seven catalogs in `www/src/i18n/messages/` (en, fr,
  es, pt, sw, ar, zh). A test checks they all match.

## Before every push

Run what CI runs, from the repo root, and check exit codes (don't pipe
them away):

```sh
bun install --frozen-lockfile
bun run lint        # Biome
bun run typecheck   # every package, including tests
bun run test        # every package
bun run build
(cd www && TAURI_ENV_PLATFORM=linux bun run build)   # the native jobs prerender "/" on the server
cd www/src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test --lib
```

Gotchas learned the hard way:

- Biome rewrites `\u2014` escapes into a literal em dash; build such
  strings with `String.fromCharCode`.
- Dependencies that are imported lazily must be listed in
  `www/vite.config.ts` `optimizeDeps.include`, or dev reloads the page
  and can load Yjs twice.
- Workers refuse random values, timers and I/O while a module loads. Anything
  the server imports (i18n and what it imports) must not do that at import:
  `new Y.Doc()` draws a random id. A module like that took the whole site
  down on 16 October; `bun run deploy` now runs `scripts/worker-smoke.ts`
  (the built Worker, locally) first, and `bun run smoke` runs it alone.
- Anything at the app root (`routes/__root.tsx`) is prerendered on the
  server for the native builds: browser-only stores (the library,
  IndexedDB) may only be touched after mount.
- Every SVG that is artwork, not an icon, needs `data-brand`, or the
  global two-tone icon style dims its paths.
- After adding a D1 migration: `wrangler d1 migrations apply notables-database --local`
  for dev, and `--remote` before deploying.
- Android: `bun run tauri android build --debug --apk --target aarch64`
  from `www/`. Needs `ANDROID_HOME`, `NDK_HOME`, `JAVA_HOME`, plus
  `ANDROID_NDK` (CMake for whisper.cpp) and
  `BINDGEN_EXTRA_CLANG_ARGS_aarch64_linux_android=--sysroot=$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot`.
  `ort` has no prebuilt ONNX Runtime for x86_64 Android, and the ARM build
  crashes in ChromeOS's `libhoudini` translator, so since v0.2.5 every Play
  bundle carries arm64 and x86_64, both linking Microsoft's pinned AAR:
  `bun scripts/android/onnxruntime.ts` extracts each ABI and prints the env
  (`ORT_LIB_PATH`, `ORT_PREFER_DYNAMIC_LINK`, `NOTABLES_ORT_ANDROID`), and
  `src-tauri/build.rs` points each target's linker at its own copy. A plain
  local aarch64 build without that env still links ort's static prebuilt.
  On Android, binary IPC bodies arrive as JSON arrays (`src/ipc_bytes.rs`).
  Every `media://` and IPC response on Android passes through
  `RustWebViewClient.shouldInterceptRequest`, which copies the whole body into
  the app's Java heap (256 MB on the TECNO). Read media files through the local
  media server (`playableUrl`), never `media://`: sync sending large recordings
  to a linked device ran the heap out (OutOfMemoryError, 17 Oct).
- Live coding on Android (frontend edits appear on the phone in about a
  second, no APK): `adb reverse tcp:3000 tcp:3000`, then from `www/`
  `bun run tauri android dev "TECNO CI6" --host 127.0.0.1`. Without
  `--host` Tauri hands the phone the Linux container's address, which it
  can't reach. Debug builds allow plain HTTP for this
  (`gen/android/app/src/debug/res/xml`); release allows it only to the
  app's own media server on 127.0.0.1.
- In live mode, don't `git stash` (touching `www/wrangler.jsonc` restarts
  the dev server and can leave the app on its splash); lint the changed
  folders with `bunx biome check www/src packages www/test` instead. Rust
  changes need live mode restarted. Clear `www/node_modules/.vite` after a
  dependency moves, and restart, or the server keeps old package paths.
- Test on the phone through WebView DevTools (`adb forward tcp:9333
  localabstract:webview_devtools_remote_<pid>`) with real touches from
  `adb shell input` (`motionevent DOWN/MOVE/UP` for holds); destructive
  features get a dry run on the device first (the media sweep's caught a
  bug that would have deleted book covers).
- Dev server: `cd www && bun run dev` (port 3000). Desktop app:
  `bun run tauri dev`. On Linux a leftover `notables` process makes new
  launches exit silently (single instance); `pkill -f target/debug/notables`.

## Status (October 2026)

- 20 October: Hino UI 0.1.6 published through its trusted npm workflow and
  docs deployed (Worker a52da79d-5e8d-4eea-bea4-1f5d7ef9e284). Notables and
  Pluraliti now pin that same version. It supplies accent-tinted grounds,
  matte glass, slimmer focus rings and safer popup placement. Wallet form
  contracts, defaults, draft assembly and appearance sheet are separate modules;
  draft tests protect redacted fields and security-code removal. Continue
  scanner lifecycle/native contracts in docs/MAINTENANCE.md. These source
  changes are deployed on the web (Worker 173e39e3-037d-4641-a464-4c439370e90d)
  and require the next native app build to reach installed devices.

- Pairing regression (20 Oct): reproduced on TECNO 0.2.12, which reports success
  but lists no peer, including after restart. Regression tests also reproduce
  historical removals blocking devices after changing spaces. Membership now
  persists during authenticated pairing on both sides, separate from online
  presence. Removal guards are scoped per space; explicit reapproval persists.
  Android 17 LAN permission is requested from pairing, with reconnection after
  grant. Existing loopback media service stays private. See
  [the pairing checkpoint](docs/reviews/2026-10-20-pairing-membership.md).
  Physical 0.2.13 acceptance: fresh iPhone/TECNO approval lists both peers;
  notes, return edits and trash changes sync. ChromeOS 0.2.13 reconnects after
  TECNO restart and exchanges note changes with both phones. Fresh ChromeOS
  approval, offline conflicts and direct-only LAN transport remain unverified.

- Maintainability cleanup (20 Oct): audit and staged plan are in
  [docs/MAINTENANCE.md](docs/MAINTENANCE.md). Deep app imports now use `@/`.
  Update policy, runtime store, hooks and Hino presentation are separate modules
  under `features/updates`; contracts are in `model/types.ts`. Shared toolbar
  buttons use Hino IconButton. Sharing announcements no longer prolong fast
  mailbox polling, foreground events cannot overlap polls, and the runner owns
  session cleanup. Drizzle schemas and typed D1 repositories now separate public
  storage from services; ratings and reaction totals update atomically. Existing
  migrations remain unchanged. Setup has separate pages and owned props, Hino
  fields and choices, compact spacing and reduced-motion transitions. Broader
  Hino adoption and Rust domain splits remain queued. Release CI uses one vX.Y.Z
  tag for mobile and desktop packages; desktop
  installers collect in one draft release. The 0.2.13 Linux, Windows and Apple
  Silicon builds passed; Intel Mac lacks an ONNX Runtime prebuilt and failed, so
  collection was skipped. No desktop functional testing today.
  The Drizzle and setup verification record is in
  [the 20 October review](docs/reviews/2026-10-20-drizzle-and-setup.md).

- Update awareness (20 Oct): packaged release apps check public release policy,
  warn before a seven day deadline, then replace the app with an update screen.
  Known deadlines survive offline restarts; withdrawal clears them. Browser
  serving and document sync pause without forgetting approval. All channels
  start disabled pending verified store availability. See
  [the update handover](docs/reviews/2026-10-19-app-updates.md) before publishing
  a required version. Physical native store navigation remains to be checked.

- Public beta preparation (19 Oct): v0.2.11 (10024) built successfully for
  Android and iOS. Android 0.2.11 is public in Open testing as of 20 Oct,
  with unlimited testers in 30 countries;
  Apple export compliance is saved and external beta is Waiting for Review. Fresh six-image
  iPhone and iPad sets and updated Pherus metadata are saved in Apple's listing
  draft. External group Notables Public Beta and its public invitation exist,
  with build 10024 awaiting Beta App Review. Google's legal URL check passes
  after the owner approved disabling zone-wide Bot Fight Mode. See
  [the beta checkpoint](docs/reviews/2026-10-19-public-beta.md) before resuming stores.

- Sync regression checkpoint (19 Oct): see
  [the sync recovery review](docs/reviews/2026-10-19-sync-recovery.md).
  Regression tests reproduced missing catch-up after transport changes, missing
  bodies for new notes, missed offline text deletion, and deleted notes returning
  after offline metadata edits. All required repository checks pass. Native apps now try the
  local link before relay and retain open local links if the room disconnects.
  `SPACE` replaces `SPACE_ROOMS`; the `space` export has a rename migration from
  `SpaceRoom`, namespace `notables_space`. Deployed and verified with two
  synthetic peers (Worker b7a1c6c8-186f-47ea-9b61-7084cf9b096e). Do not remove
  migration v1. Commit 78b2850 is pushed; the in-flight v0.2.10 native build
  was cancelled to include a further Vision wrapped-number parsing fix in
  v0.2.11. See the wallet handover for that regression.

- 19 October: updated Play listing had remained a draft while the older
  submission published. Saved and submitted the seven updated listing changes
  (copy, feature graphic, phone and both tablet screenshot sets). Console now
  says Changes in review; the public listing still has the older assets until
  Google publishes the update.

- 19 October: v0.2.8 Wallet Face ID still failed physically. The follow-up
  queries real UIKit activity for legacy lifecycle recovery and guards the
  frontend first card load against late Face ID blur. Regression tests and
  all required checks passed. Release target ios-v0.2.9; CI UIKit compilation
  and physical iPhone verification remain required. See the wallet handover.


- 19 Oct follow-up: v0.2.8 (10021), commit 516a6c9, uploaded successfully to
  Play and TestFlight. Export compliance was submitted with the owner’s
  confirmation: standard encryption beyond Apple OS, France excluded. Build
  10021 shows Testing in Pherus developers. iPhone Face ID repair still needs
  physical confirmation. Pherus
  legal deployment and Notables web deployment are live. The owner approved
  Cloudflare configuration rule 9b1e54df555f4faeb634437abfaba76f; it disables
  Browser Integrity Check only for GET/HEAD on pherus.org public legal routes
  (en, fr, zh), robots.txt and sitemap.xml. Rule is active. Play's deletion URL
  checker now passes. The same Python client reads all those URLs as HTTP 200,
  while the homepage remains 403, confirming the exception is scoped.

- Store refresh (18 Oct): Play draft has Notables by Pherus, revised copy,
  a fresh feature graphic and six current screenshots in each phone, 7-inch
  and 10-inch tablet slot. Nothing submitted for public review. Source copy
  and SDK disclosure corrections: docs/store/listing.md. Data safety draft now includes ML Kit
  identifiers, diagnostics and interaction events for analytics. Google's checker
  still gets 403 from the deletion/privacy URL; official policy alignment,
  Desktop screenshots and external beta setup remain.

- v0.2.7 release fix (18 Oct): v0.2.6 Android crashed on both real ABIs because
  optimization removed ML Kit registrar constructors. Narrow consumer rules,
  deferred reader initialization and a real bundle verification gate address
  it. Optimized isolated release tests launch on TECNO ARM64 and ChromeOS
  x86_64, with owner data preserved. iOS tools version is corrected from 5.3
  to 5.5 for its iOS 15 manifest. CI now compiles iOS and verifies the real
  Android AAB, but first-attempt distribution failed: Apple profile lookup
  and Google service unavailable. Run 39133139435 attempt 2 uploaded Android successfully to Play internal;
  iOS attempt 3 exported and uploaded successfully after NFC_TAG_READING was
  enabled on the App ID through the existing CI Apple API key. Evidence:
  docs/reviews/2026-10-18-release-startup.md. Current TECNO is
  192.168.1.2:5555; ChromeOS is 100.115.92.2:5555. Verify model before use.

- v0.2.6 preparation (18 Oct): Wallet has mandatory native authentication,
  30 minute access and separate five minute protected fields, compact front/back
  review and distinct card print for eight kinds. The raw progress bar is replaced
  with a local-reading indicator; card transitions respect Reduce Motion and
  locking removes content immediately. TECNO gallery/save/restart evidence and
  remaining boundaries are in the Wallet handover and 18 Oct scanning review.
  Bank-front classification is fixed, but that photo still loses one OCR digit;
  the review warns rather than inventing it. No Wallet sync or source approval
  transfer is implemented. Public beta setup and current store disclosures are
  next; the release pipeline uploads to Play internal and TestFlight first.

- Wallet work resumed 18 October and is not complete. The owner's mandatory
  30 minute Wallet unlock and separate five minute sensitive field grant
  supersede older optional protection wording. See the Wallet handover for
  current code, physical evidence and remaining checks. TECNO is now
  `192.168.1.2:5555`; verify its model before testing. Addresses change. The owner now prioritizes v0.2.6 and the store review after Wallet polish;
  Circles remains queued.

- Wallet live scanning and presentation (18 Oct): camera frames now use a
  retained, bundled Android ML Kit reader, with Apple Vision implemented for
  iOS and bundled Tesseract fallback. Two clear frames must agree before
  review; nothing saves automatically. Installed on the TECNO with data
  preserved; the owner confirmed automatic review from a physical card.
  Three synthetic native reads took 425, 161 and 139 ms. Card-first review,
  compact grouped fields and controls, tighter stack and shared card motion
  replace the large form. NFC is now registered on iOS too, with usage text,
  TAG entitlement and cancellation. It reads NDEF text only; NFC hardware/tag
  and iPhone verification remain owed. See the
  [Wallet checkpoint](docs/reviews/2026-10-18-wallet-scanning.md), including
  Android SDK diagnostic disclosure required before release.

- Android v0.2.5 build fix (18 Oct): the ONNX preparation step hashed an empty
  buffer on a fresh runner. Bun.file retained missing file metadata after its
  exists check, even after Bun.write downloaded the valid archive. The reader
  now opens a fresh handle after writing. The pinned SHA-256 is unchanged.
  A regression covers the first download and cache reuse; an isolated empty
  cache run downloaded and extracted both ARM64 and x86_64 successfully.

- v0.2.5 (18 Oct): the Play Store app crashed at launch on the Chromebook
  (arm64-v8a under libhoudini); the release now builds arm64 and x86_64 with
  Microsoft's ONNX Runtime for both. Check the natural voice on the TECNO,
  since phones moved from ort's static ONNX Runtime to the shared one. The web
  sends a never-linked browser from / to /link before the app boots
  (`platform/session/link-boot.ts`); the main chunk (about 1.3 MB, editor and
  Yjs included) and the `@notables/sync` barrel on /link remain the load cost.

- Folders and iOS linking (18 Oct): deleting a folder now sends its notes to
  Recently Deleted (`library/lib/delete-folder.ts`); `Library.removeFolder`
  only removes the folder. iOS: with store v0.2.4 on Android, the iPhone
  approves and both say linked, but the devices never list each other and
  nothing syncs. Pairing works, so the iPhone reaches the room; the fault is
  after pairing (space room, hello or frames). Being traced live from the
  Chromebook's Notables Dev with a WebSocket recorder while the iPhone links.

- Android crash fix (18 Oct): Notables Dev on the TECNO died with
  OutOfMemoryError allocating 28.8 MB in `Rust.handleRequest`. Media loads
  (`nativeMedia.load`, used by device sync and browser sessions) fetched whole
  files through `media://`; they now go through the local media server, and
  the CSP allows `connect-src http://127.0.0.1:*`. Diagnosed from code and the
  crash log (the notes database stays on the phone); not yet run on a device.
  `packages/ultrapeach` (untracked leftovers) is deleted; docs name Hino.

- Remote Disconnect, spec 0005 step 7 (17 Oct, v0.2.4): Disconnect is on the
  OTHER device's row in Connected Devices, never on this device. Each app has
  its own X25519 key (`space_device_secret`, key store) sent in its hello and
  pinned on first sight. Disconnecting makes a new root secret sealed per
  remaining device and bound to the remover's key
  (`packages/sync/src/space/space-rotation.ts`); devices that moved keep a
  `<id>-handover` seat in the old room for 30 days to hand it on and to tell the
  removed device, which keeps its notes and starts its own space
  (`www/src/platform/space/space-removal.ts`). Devices that never sent a key
  must be linked again. Not yet run between two real devices.
  Also: spreadsheet columns and rows resize (synced), arrow keys move between
  cells, numbers align right; Share, Narrate, Export, Style and Download PDF
  use Hino's small (36 px) button, and Read matches.

- Workspace and web tabs (17 Oct, v0.2.3): the Workspace column is fluid,
  `clamp(28rem, 72cqi, 42rem)` of the Workspace pane (sidebar excluded):
  562 px on a portrait tablet, 624 px landscape, 672 px on desktop, full width
  on phones. The empty New Folder card is one row. A linked browser's tab bar
  is Workspace, Books, Finances, Settings (Books replaces Wallet) and Personal
  hides Wallet. In development, `VITE_PUBLIC_URL=https://notables.pherus.org
  bun run dev` puts the local web in the deployed room, so it links to an
  installed phone app with real data.

- 17 Oct device checkpoint: masked identifiers and compact device/browser rows
  are implemented. Known authenticated devices retain offline history. Native
  TECNO/ChromeOS sync was checked both ways with ChromeOS sync check. Debug
  launcher is Notables Dev to distinguish it from the preserved store app.
  A subsequent Settings layout redesign was rejected by the owner and reverted.
  Keep web Settings navigation unchanged; refine component usage in the apps.
  Do not install the temporary settings APK built before that revert. Check the
  actual linked browser and installed apps before claiming visual completion.
  Details: docs/reviews/2026-10-17-writing-refinement.md.


- Personal, Finances and drafts (17 Oct): Workspace uses a smaller title and
  synced Hino folder colors. Personal replaces Artifacts and includes Wallet;
  Finances replaces the Invoices label while existing document links stay valid.
  Tab roots Wallet, Finances and Settings no longer have mobile Workspace arrows.
  New Note opens a follow-up menu with Back. The editor title is visible on wide
  screens; new empty notes stay out of the library until content is entered.
  Reading-mode checklist taps work without opening the keyboard. Finances has
  a live ledger derived from documents and confirmed income/expense records,
  CSV export, camera/image receipt OCR review and pasted mobile money messages
  with duplicate checks. Background SMS monitoring is not implemented.
- ChromeOS Android testing (17 Oct): ADB `100.115.92.2:5555` is authorized.
  This Dell advertises ARM64 translation but the ARM debug APK crashes in
  `libhoudini` before WebView startup. A native x86-64 build opens successfully.
  `bun run android:chromeos` uses the checksum-pinned Microsoft ONNX Runtime
  1.28.0 Android AAR from Maven Central, retaining natural voice support.
  ChromeOS gets desktop launch bounds, free resizing and its own platform marker;
  attached keyboards enter editing directly. Keep Android media IPC and native
  notifications on ChromeOS. See the latest section of
  [the refinement record](docs/reviews/2026-10-17-writing-refinement.md).

- Settings and navigation refinement (17 Oct): compact 44 px Settings rows in
  Devices & Sharing, Personalization, Writing & Tools, and App & Privacy.
  Writing owns note fonts, sorting/display and swipe choices; Appearance keeps
  app appearance/language. Sidebar settings no longer duplicate folder links;
  unavailable Lock controls are summarized honestly. Circles is in Workspace
  Personal, not Settings; old Settings links redirect to its screen. Main
  screens use Workspace back links. On mobile, only Workspace shows a sidebar
  toggle; desktop/tablet sidebar controls remain available. Mobile Workspace back
  links appear on Books, Calendar and Recently Deleted; tab roots omit them. Folder headers put the actual name next to Back,
  omit duplicate search (the bottom search stays), and list rows are 68 px.

- Owner refinement (17 Oct): home is now Workspace with folder cards, Artifacts
  below folders on Workspace only (removed from the sidebar), compact grouped white note lists on a fill backdrop, inline folder titles and inset separators,
  three-column gallery previews with centered captions, actual folder back labels,
  no search field inside folders (the bottom search remains),
  a 32 px default More button
  without a separate compose icon, shared note open/return transitions on phones,
  icon menus and a scrollable editor strip,
  adjacent multi-photo layout, live camera/page review/PDF scanning and retryable
  metadata previews through a deployed stable endpoint. Folder snapshots no
  longer churn on note edits; hidden phone lists and repeated toolbar state
  updates were removed. Read [the refinement record](docs/reviews/2026-10-17-writing-refinement.md)
  for measured evidence and the remaining scanner/performance boundaries.

- Writing workspace checkpoint (17 Oct): folders, list/gallery/date grouping,
  richer editor, attachments/TOC/tags, spreadsheet formulas, linked note and
  invoice reminders, browser media and phone-owned sharing are implemented.
  Read [the checkpoint](docs/reviews/2026-10-17-writing-checkpoint.md) before
  resuming: it distinguishes device evidence from outstanding work. Lock,
  public person IDs and physical iPhone verification remain open. No new store
  release has been tagged. TECNO Wi-Fi ADB moved to 192.168.1.3, port 5555.

- Device linking followup (17 Oct): the owner tested v0.2.2. Android could
  approve the iPhone, but joining the iPhone's space failed after the four
  words: Android's secure store only created keys and refused replacing the
  existing space root. `KeyStore.replace` now uses the existing Android
  wrapping key and an atomic ciphertext replacement; wallet key creation
  stays exclusive. Native pairing waits for an encrypted saved receipt and
  reports failures to the approving device. Pairing effects survive parent
  renders. Connected Devices is directly below the profile, Linked Devices
  is for browsers, IDs are masked under No account needed, and Disconnect
  This Device starts a new space while keeping local notes and ending its
  browser sessions. Checked through Wi-Fi adb on the TECNO debug app:
  existing key replacement, joining and approving a protocol test peer,
  failed-save feedback, settings order, masked/revealed IDs and cancelling
  disconnect. The installed v0.2.2 release is preserved. A real iPhone check
  on the next build remains owed.

- Fixes from the owner's phones (16 Oct, `v0.2.1` and `v0.2.2`): release
  builds never set `VITE_PUBLIC_URL`, so packaged apps looked for the device
  rooms, server functions and share links on the phone itself and linking
  two phones always timed out; `deployedSite()` in `platform/public-url.ts`
  now defaults to notables.pherus.org. QR codes (`SealCode`) were faded by
  Hino's two-tone icon style: they carry `data-brand` and a 4-module quiet
  zone. Removing the examples is a notice at the top of Notes and Books
  (`onboarding/components/examples-notice.tsx`), and every book row has a
  "…" button with its menu, Delete included. Not yet checked on the phones.
  Linked devices do not sync media yet (photos, recordings, drawn pages,
  covers): the spec sends media only over direct links, which aren't built.

- Stores and v0.2.0 (16 Oct): both store pages are filled in and saved as
  drafts, nothing submitted for review. App Store Connect: texts, App
  Information (subtitle, Productivity and Books), age rating 4+, App Privacy
  (photos or videos, audio, other user content; App Functionality, not
  linked, no tracking), free in 174 regions (not France), App Review contact,
  6 iPhone 6.1-inch (1179x2556) and 6 iPad (2732x2048, landscape) shots.
  Google Play: feature graphic, 6 phone shots, 6 tablet shots in both the
  7-inch and 10-inch slots. Screenshots come from `bun run store:screenshots`
  (`scripts/store/`, see Releasing). The welcome comic "Pip & the Lamp" is
  now one full colour page with a cover and embedded lettering
  (`onboarding/content/welcome-comic.ts`). The web was deployed and
  `v0.2.0` tagged (Play internal track and TestFlight, no public release).
  `listing.md` still names one App Privacy data type (Apple has three) and
  says user-generated content "Yes" where the Apple age rating says no:
  settle one.

- Browser sessions, spec 0005 steps 2 and 3 (16 Oct): the web is a window
  onto a phone, like WhatsApp Web. `notables.pherus.org/link` shows a QR
  code and code; the phone's Settings › Linked Devices › Link a Browser
  scans or types it, both show four words (CPace, `packages/sync/src/pairing`),
  and the phone approves. The browser then loads and saves every document
  through the phone over a local WebRTC link with no STUN or TURN
  (`packages/sync/src/session`, `www/src/platform/session`), keeping only
  the session key. The `SpaceRoom` Durable Object (`www/src/server/spaces`,
  worker entry `www/src/server.ts`) only introduces devices and stores
  nothing. Open copies of a document share one stored copy
  (`createSharedPersistence`), so a phone's editor and its browser edit
  together. Checked end to end in Chromium (pairing, library, edits both
  ways, reconnect, phone away banner, nothing in IndexedDB), then on the
  TECNO over real Wi-Fi (16 Oct): the camera scanned the QR from the
  Chromebook screen, words matched, edits both ways, reload reconnects,
  force-stop shows the banner and relaunch resumes editing. The dev
  server now behaves like production (the web asks to link a phone);
  `VITE_STANDALONE_WEB=1` brings back the standalone web library.
  Wireless adb works from the Linux container: scan 192.168.1.x for the
  Wireless debugging port (mDNS doesn't cross ChromeOS's NAT) and
  `adb connect`; this computer's key is already trusted. The web hides the wallet, device settings,
  read aloud and recording. Deployed 16 Oct (room checked live with two
  test peers).
- Live mode note: `tauri android dev` starts Vite in native mode, without
  the Cloudflare plugin, so `/spaces/connect` doesn't exist there. Run
  `bun run dev` yourself and start live mode with
  `--config '{"build":{"beforeDevCommand":""}}'` to test linking on a phone.

- Android performance and listening (15 Oct, measured on the TECNO):
  Android streams stored media through the local media server (the
  WebView applies byte ranges to `media://` responses itself, so audio
  stalled after 4 MB and seeking failed); large files save in base64
  pieces (`storage_media_save_part`); `RECORD_AUDIO` declared (recording
  was refused); the natural voice lowers its flow matching steps (5 to 3)
  per device when it can't keep up (`voiceSteps` in
  `listening/lib/natural-voice.ts`); long books paginate one chapter at a
  time (`books/reader/use-book-pages.tsx`; 883 pages opened in 0.55 s, was
  a 9.2 s freeze); iOS-style scrubbers; read aloud skips a contents list.
  PDF import finds real paragraphs and chapters (`read-pdf.ts`).
- Also 15 Oct: Hino replaced UltraPeach (`@phe-rus/hino` 0.1.5 on npm,
  published from `~/pherus/hino` by its `publish.yml` workflow); dates and
  times use Hino's compact pickers. Notes open for reading on touch
  screens (`ReadModePlugin`), and the caret stays above the keyboard
  (`KeepCaretVisiblePlugin`). Hold and slide selects on Android.
  Handwriting has Done. Photos are media files (`resolvePhoto`), shared
  notes send their media (`packages/sync/src/peer/media-exchange.ts`), and
  a daily sweep deletes media unused for a week
  (`features/trash/lib/media-sweep.ts`). TestFlight 0.1.8 (`ios-v0.1.8`)
  carries everything up to `870dddf`.

- Ultrapeach Sheet, menu ownership and modal background hardening are complete for the current checkpoint. Read [the Sheet focus record](docs/reviews/2026-10-10-ultrapeach-sheet-focus.md) for browser evidence and remaining boundaries. The owner requested committing without releasing, then returning to Pherus UI adoption.

Shipped and tested in the browser (Playwright) unless noted:

- Library, editor, publishing, books with page turns, highlights, recycle
  bin (7 days), bulk import (EPUB, PDF, CBZ, audio), comic and manga
  readers, welcome examples.
- Handwriting (ink blocks, pen pressure, palm rejection) and note fonts.
- Invoices, receipts and quotes: signed seal, QR check, check-by-number,
  hidden camera-only tamper mark, full-screen preview, PDF, business
  profile, recent clients.
- AI with the person's own key (Claude, Gemini, OpenRouter), off by default.
- `notables://` deep links; splash and first-run setup.
- Calendar: plans, reminders (ticked off per day), birthdays and
  anniversaries (year optional, two alerts), deadlines, trips over
  several days; Day/Week hour grids (drag to move and resize, pinch to
  zoom), continuous Month and Year scrolls, Years from 1990; the title
  zooms out, a tap zooms in, Today zooms home; Type It... adds from a
  sentence (English). Public holidays per country from
  `date-holidays`, computed on the device. Phones schedule natively (not
  yet tried on a device).
- Books contents are playlists: groups (parts) and entries carry each
  item's own words (`books/model/structure-labels.ts`), fold open, move,
  and are filled from files or folders.
- Connections (`features/connections`): people from shared notes, who is
  online, last seen on this device, invite from there.
- Shared `Picker` pop-up button replaces every native select; the note
  top bar and segmented controls adapt with container queries.
- Drawing studio for comic, manga and picture-book pages
  (`features/studio`); drawn pages are images that keep an editable scene.
- Export: EPUB, PDF, Word, HTML, Markdown, text, CBZ, image ZIP, audiobook
  ZIP (`features/books/export`).
- Listening (`features/listening`): app-wide audiobook session and mini
  player, read-along with on-device Whisper (native decode in
  `src-tauri/src/transcription/decode.rs`), read aloud with natural
  device voices or Gemini voices (Gemini untested with a real key).
- Natural voice on the device (spec 0001, in progress): Supertonic 3 via
  ONNX Runtime (`src-tauri/src/voice`), versioned checksummed model packs
  (`src-tauri/src/models`, served by `/models/$` from R2), Settings >
  Downloads. Whisper now downloads as the `whisper-base` pack. Both packs
  were published to R2 on 9 October (`bun run models:publish <id>`, the
  manifest at https://notables.pherus.org/models/manifest.json); before
  that every download failed with "Check your connection", which is how
  a missing manifest shows. Publishing resumes after a dropped upload
  (only a manifest entry counts as published) and retries each file;
  this connection drops large uploads often. Not yet heard on a phone. The bucket and
  database rename (AC-14) is still open.
- Read-aloud speeds have names (Slow, Normal, Brisk, Fast, Faster,
  Fastest; `rateName` in `listening/lib/narration-settings.ts`), in
  Settings > Listening, the read-aloud bar and the audiobook player.
- Four media kinds (spec 0002, built, awaiting `/check verify` and `/test`):
  every item and series is a book, comic, manga or audiobook
  (`books/model/media-kind.ts`, read through `getBookStore().kindOf`),
  with shelves, per kind actions, franchises (`store/franchise-store.ts`),
  parts over chapters (`lib/chapter-outline.ts`), whole series delete
  through Recently Deleted (batch ids), and imports that guess the kind,
  find parts and merge into existing series (`imports/lib/import-targets.ts`).
- Seven languages with RTL for Arabic; Simplified Chinese (`zh`, one
  plural form) also serves Traditional Chinese devices for now, and the
  wallet reads cards in Chinese with the English OCR model. Main surfaces are translated; some
  deeper screens (invoice editor, importers, readers' minor labels) are
  still English.
- Peer-to-peer sharing with specific people (`features/sharing`,
  `packages/sync/src/peer`, signalling in `www/src/server/signals`,
  migration `0002_signals`). Works only while both devices are online;
  no relay or TURN yet.
- Widgets: floating desktop Today widget (`/widget`, `src-tauri/src/widgets.rs`).
  iOS and Android widget sources are in `www/src-tauri/widgets/` with
  setup steps; never compiled yet (`gen/apple` doesn't exist).
- Android (`www/src-tauri/gen/android`, in the repo): tested on a TECNO
  CAMON 19 (Android 13). Adaptive Notables icon, keyboard-aware layout
  (MainActivity), solid top bars (`data-os="android"`), system haptics and
  the Today home-screen widget with Add to Home Screen (`AndroidBridge.kt`,
  `www/src/platform/android-bridge.ts`). Haptics everywhere go through
  `haptic()` from @phe-rus/hino; menus and popovers keep to `screenEdges()`.
  Calendar on phones: week strip, back titles, self-scrolling months.
  Open: read aloud has no voice (the WebView has no speechSynthesis
  voices; needs Android TextToSpeech through the bridge); the
  notification permission check is refused at startup (`about:blank`);
  export through the save dialog is untested (content:// paths); ChromeOS
  needs an x86_64 build, which `ort` blocks. Debug the live WebView with
  `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`.

- Design language, now Hino (`@phe-rus/hino`; was `packages/ultrapeach`):
  Blush default accent (controls use rose `#d16988`), Dynamic Type text
  styles, radius scale, scoped `data-theme`, platform variants, clear glass
  on Apple, solid floating bars on Android (glass there looked out of place),
  pre-paint appearance script. Tab bar: Notes, Wallet, Invoices, Settings;
  no tab haptics. Sidebar laid out like Claude's (actions and places, then
  notes views under Workspace, then Pinned and Recents); Calendar, Wallet
  and Invoices fold under Artifacts (`sidebar.artifactsOpen`), which opens
  itself on those pages. "All notables" replaces All Notes.
- Settings is a list of pages (`features/settings/components/settings-catalog.tsx`,
  routes `/settings` and `/settings/$page`), split view on wide windows.
  Privacy & Security shows the Lock (spec 0004), switched off until its
  native adapters ship.
- Wallet: Apple Wallet stack, card detail with copy, swipe to front (opens
  the card instead: bug), passport kind, SIM PUK and ICCID, scanning with a
  card guide, contrast, MRZ (tested) and ID barcodes (zxing, bundled).
  Six fake sample cards are on the owner's phone.
- Opening a note no longer marks it as edited: the editor reports where a
  change came from (`DocumentChange.origin` in packages/pluraliti), and the
  note screen stamps `updatedAt` only for real edits.

- Stores (9 October): bundle ID and Android package are
  `notables.pherus.org` everywhere (same style as Opes). The repo is public
  (MIT); keys live in `secrets/` at the root (gitignored, backed up by the
  owner; its README lists every GitHub secret).
  Google Play: app "Notables" (Pherus organization account), internal track
  fed by CI, tester list "Pherus developers". Store listing done: texts from
  `docs/store/listing.md`, icon, feature graphic, 6 phone screenshots,
  Productivity, support@pherus.org, +256772769734, notables.pherus.org,
  privacy https://pherus.org/legal/privacy-policy, advertising ID "No".
  Still owed before production: data safety, content rating, target audience.
  Apple: team PHERUS .CO -SMC LIMITED, `LP7BW596WY`. Certificates,
  Identifiers & Profiles only opens for the Account Holder login. App Store
  Connect app "Notables by Pherus" ("Notables" is taken; the home screen
  still says Notables), TestFlight internal group "Pherus developers" with
  automatic distribution. Each iOS build asks export compliance: standard
  encryption, not available in France (until the French declaration is
  filed). The App Store page (texts, screenshots, category) is not filled
  in yet; everything is in `docs/store/listing.md`.
  Store screenshots: start `VITE_STANDALONE_WEB=1 bun run dev` in `www/`,
  then `bun run store:screenshots` (`--only=<set>`, `--compose-only` to
  redraw frames from the last capture). The owner's look, settled 16 Oct:
  no device frame (Apple Notes style), the screen as a rounded card with a
  real status bar (Dynamic Island on iPhone, punch-hole and Material icons
  on Android), Hino Blush background, Newsreader headline with a Caveat line
  in Hino rose; phones a 6.1-inch screen (390x760), tablets an iPad Pro
  11-inch screen in landscape (1180x820); the feature graphic in Inter.
  Tagline: "Anything notable, always with you." Store metadata may not name
  other apps.
- Brand (9 October): the mark is warm paper with a quiet dog-ear, the ink N
  and a honey full stop (`icons/source/app-icon.svg` full-bleed for iOS,
  `app-icon-desktop.svg` framed for desktop, web and `AppMark`). Android
  keeps its adaptive icon. CI copies `icons/ios` into the fresh Xcode
  project.
- iOS: `Info.ios.plist` holds the usage descriptions (camera, microphone,
  speech, photo saving, Face ID); a missing one ends the app instantly.
  Accelerate is linked for whisper.cpp (`bundle.iOS.frameworks`).
- Android: bar icons follow the app's appearance through
  `AndroidBridge.setSystemBarsDark` (a light app on a dark phone).
- Settings: every page icon is a round tile in the person's accent color.
  About reads the installed version from the shell (`getVersion`).
- Notes list (`features/library/components/notes-list.tsx`): preview of 0
  to 5 lines (default 2, like Mail), order, dates, pinned at top, swipe
  actions, all in Settings > Notes list. Rows (`note-row.tsx`) swipe right
  to pin and left for More and Delete (both sides chosen in Settings; a
  full swipe runs the outer action). Touch and hold: let go for the menu,
  or slide to select every note passed, like Photos
  (`lib/use-hold-to-select.ts`, which stops scrolling once the hold lands
  and scrolls near the edges); the selection bar pins, changes kind or
  deletes. The note menu is seven rows; Font and Kind open in its place
  (`openFollowUpMenu` in Hino). No drag to reorder (the owner
  doesn't want it) and no Lock action until the Lock ships. Tested with
  real touch events in Chromium at phone size, not yet on a phone.
- Languages: seven, with Simplified Chinese (`zh`).
- iOS release: CI stamps the tag's version into `tauri.conf.json` and the
  generated Info.plist before building (TestFlight builds had all stayed
  at 0.1.0). `Info.ios.plist` leaves `ITSAppUsesNonExemptEncryption` out: setting it
  without an approved document's `ITSEncryptionExportComplianceCode` makes
  uploads fail, so each build asks in TestFlight instead (see Releasing).
- pherus.org privacy policy has a "Notables app" section 4 (en, zh, fr),
  live since 9 October; source `~/pherus/pherus/www/data/legal/privacy-policy.json`.

## Releasing

The repository is public (9 October 2026), so standard GitHub runners,
macOS included, cost nothing. CI still never runs on a commit, by the
owner's choice: check locally before pushing, as above. Builds start only
from a tag or by hand:

```sh
git tag v0.2.13 && git push origin v0.2.13  # all platforms, one version
gh workflow run release.yml -f platforms=desktop -f version=0.2.13
gh workflow run ci.yml                    # web checks, on demand
```

The tag gives the version; the run number gives the build number, so every
upload is newer than the last. Manual release runs require an explicit version
and can select all, mobile, desktop, Android or iOS. Use only vX.Y.Z release tags;
legacy platform tags are historical. Linux x64, Windows x64 and macOS arm64/x64
installers collect in one draft GitHub release with checksums. These desktop
builds still need functional acceptance and production signing/notarisation.
APT distribution is a later signed Pherus repository, not merely hosted .deb files.

Workflows (9 October): actions on Node 24 (checkout v7, setup-node v7,
setup-java v6, upload-artifact v7), Linux jobs pinned to `ubuntu-24.04`
(not `ubuntu-latest`, which moves to Ubuntu 26 from 19 October), Play
upload with `tracks`. Each TestFlight build asks two questions: choose
"Standard encryption algorithms instead of, or in addition to, ...
Apple's operating system" (wallet ChaCha20-Poly1305, share keys, TLS),
and France: "No" until the French declaration is filed. Never set
`ITSAppUsesNonExemptEncryption` in
`Info.ios.plist` without an approved encryption document's code: it makes
TestFlight refuse the upload; each build asks in TestFlight instead.

## Next

- Verify the new pairing build on iPhone, TECNO and ChromeOS before calling
  connection recovery complete. The membership/removal regressions pass locally;
  physical bidirectional sync and same-network continuation still need checking.

- Continue the first unfinished stage in [docs/MAINTENANCE.md](docs/MAINTENANCE.md):
  verify request counts on devices, introduce typed Drizzle D1 repositories,
  then clean Wallet and Finances by domain. Keep the accepted local-first storage
  and cryptographic formats. Desktop CI packaging is build-only for now.

- Publish the update-aware native build after local verification, then test
  its store links and iOS receipt detection. Leave release policies disabled
  until an update is available to the relevant users. Continue the pending
  store reviews and physical sync/Wallet acceptance below.

- Current priority (19 Oct): verify the sync recovery changes on iPhone,
  TECNO and ChromeOS after releasing a shared build. Both Android production
  apps report 0.2.8 (10021); iPhone reports 0.2.9 (10022). LAN discovery without
  internet, direct internet ICE traversal and visible history remain unfinished.
  Wallet: Face ID stays open on 0.2.9, confirmed by the owner; live camera OCR
  still fails on iPhone, and NFC closes/relocks it. System prompt lifecycle fixes
  have regression coverage but are not yet physically verified on iPhone.

- ios-v0.2.9 (10022) is Testing in the existing Pherus developers group.
  Export answers were submitted with owner confirmation. The owner physically
  confirmed Face ID now opens Wallet and keeps cards visible.
- Finance conversation imports, receipt controls and native receipt recognition
  are implemented. The TECNO read UGX 1250 and the reference from a synthetic
  receipt, and enlarged its image. Final save/removal checks remain pending.
  FINANCES creates stable yearly spreadsheet views of the ledger; they derive
  from the canonical records. The folder can be renamed or removed.
- The notes list now includes Previous 7 Days and a real bottom spacer for
  safe-area clearance. Confirm scrolling physically on iOS. README screenshots
  use the newer store set. Combined checks pass: 228 app, 56 Rust, two ignored.

- Owner’s latest priority, 19 Oct: iPhone Wallet shows Face ID, then stays locked.
  Tao 0.37.1 emits Suspended on resign-active but only Focused(true) when
  Face ID closes. Wallet now restores iOS foreground access on that event;
  authentication still must succeed to grant access. Regression failed before
  the fix with Locked and passes afterward. Physical TestFlight verification
  remains owed. See docs/reviews/2026-10-19-ios-wallet-resume.md.
- Official product, showcase and legal authority: https://pherus.org, with
  Notables at /showcase/notables. Legal content belongs in ~/pherus/pherus/www,
  not Notables-hosted legal pages. GitHub is the source repository, not the
  authoritative public product or legal website. Continue central legal
  external beta setup after Wallet. Central legal deployment and Play crawler
  verification are complete. v0.2.8 (10021) is Testing in the existing internal
  TestFlight group. Next verify Wallet Face ID on the owner’s iPhone before
  external beta. Play Publishing overview now shows 0.2.7/10020 and 30 regions
  in review; this review submission was observed, not made by this session.
- v0.2.7 uploaded to Play internal and TestFlight. Apple NFC capability is
  enabled. Play open testing has 30 regions selected and a 10020 release
  draft; it is not public. Mainland China awaits its separate filing review.
- Previous checkpoint: commit/push the Wallet checkpoint and deploy
  the web, tag v0.2.6 for both store builds, then review Google Play Console
  drafts, disclosures, feature graphic and phone/tablet screenshots. The beta
  should accept users outside the team: Play open testing and TestFlight
  external public-link testing, after their store review/setup. Uploading to
  the current internal pipeline alone does not open that beta. Preserve the
  bank-photo OCR limitation in the beta testing notes. Circles follows this
  release/store checkpoint.

- Owner, 18 October: source approval and resumable sync direction is recorded
  in [the spec 0005 amendment](docs/specs/www/0005-linked-devices/0005-source-approval-and-resume.md).
  It is not implemented. Preserve browser memory only storage; approvals happen
  on the source, roles are visible, iOS wake is best effort, and an explicitly
  approved Android phone can provide browser continuity. Wallet sync is opt in,
  native only and local network only. Older automatic Wallet sync wording is
  superseded. Continue the unfinished Wallet protection and UI work first.

- Wallet: verify a physical NFC tag on supported hardware, compile and test
  Apple Vision on an iPhone, and update the Android SDK diagnostic disclosure
  before a release. Preserve the TECNO's current review and existing cards.
- The owner confirmed the Android v0.2.5 retry works. The iOS v0.2.5
  TestFlight build already succeeded. Keep
  the Android voice check on the TECNO, since both ABIs now use shared ONNX.

- Remote Disconnect (built 17 Oct, v0.2.4): run it between two real devices
  (the Chromebook app disconnecting the TECNO), then confirm the TECNO shows
  "This device was disconnected" and the rest keep syncing. Keep Linked
  Browsers separate, with small Hino destructive Log Out buttons.
- Workspace layout: keep the original vertical stack, folders then Personal.
  The owner rejected both the side column and guessed width adjustments. Its
  width is max-w-md (448px) at the current web size, then 512px and 576px
  when the available Workspace container reaches 1024px and 1280px. Use the
  content width, not the whole window including its sidebar.

- Owner testing checkpoint, 17 Oct: review compact component usage in Settings on Notables Dev
  on the TECNO and native ChromeOS Android app. Continue any visual corrections
  from that evidence before broader features. Keep the store installations and
  data intact. Remaining boundaries include automatic SMS intake, native iOS
  widgets and iPhone editor checks; these are not completed by the finance or
  Settings work. Details: docs/reviews/2026-10-17-writing-refinement.md.

- Verify the updated ChromeOS Android window/input behavior and pairing with
  the TECNO. Browser linking to the TECNO has shown both directions live.
  Check reconnect and serving a browser from each installed Android device.
  Do not replace the phone space when joining the Chromebook.
- Finances: finish device checks for receipt camera/image import, ledger export,
  and transaction editing. Background mobile money SMS collection needs an
  explicit Android permission and store-policy design; iOS inbox access is not
  available through the ordinary app APIs. Pasted message review is built.
  A ledger row preserves invoice/receipt/quote type and currency; it must never
  treat an unpaid invoice or a quotation as received cash.

- Owner review of the compact folders, Workspace back links and reorganized
  Settings on the TECNO (currently 192.168.1.2:5555). Preserve existing data
  and preferences. Secure Lock and physical iPhone evidence remain open.

- Review the [17 October refinement](docs/reviews/2026-10-17-writing-refinement.md)
  on the TECNO and iPhone. Continue measured performance work, real document/card
  scanning and native media checks; keep the earlier Lock and public-ID work open.

- Continue the [17 October writing checkpoint](docs/reviews/2026-10-17-writing-checkpoint.md).
  The packaged Android launch and share chooser checks passed. Next, native-to-native
  media and physical iPhone checks. Finish the shared Lock from spec 0004 and separate public
  person identity before claiming the full owner request complete.

- Owner's 17 October direction in docs/STAGES.md takes priority: finish
  device verification, then the iOS keyboard toolbar and note title, then
  folders and the revised writing Workspace. The full request is recorded
  there, including list/gallery views, optional date groups, Circles in
  Workspace Personal, Books in Personal, richer editing and scanning, spreadsheet
  notes, image management, nearby media and the float32 transcription bug.

- Start with "Queued from the 16 October review" in docs/STAGES.md (A before
  any public release, then B for Apple Notes parity); the reasoning is in
  [the parity and compliance review](docs/reviews/2026-10-16-parity-and-compliance.md).
  pherus.org's privacy policy and terms cover Notables as of 16 Oct
  (deletion, reporting, content rules, governing law Uganda); `v0.2.0` is in
  TestFlight and Play internal testing.
- Settings follow the person (AC-16, 16 Oct): one synced Yjs document,
  `settings` (`www/src/platform/settings/synced-settings.ts`), served to a
  linked browser like the library. In it: preferences (minus haptics and
  sidebar width and folding, kept per device under
  `notables:device-preferences`), the person's name, language, listening,
  holidays, business profile, invoice defaults, known issuers. Apps mirror
  each value to localStorage (pre-paint, fast reads) and moved their old
  values in on first run; a linked browser keeps none. Checked live on the
  TECNO both ways. Testing tip: in dev, import a module through the URL the
  app loaded (with its `?t=` stamp), or you get a second copy of the store.
  Still per device: reminder alerts, recents (memory only in a browser),
  reading and listening positions (the player saves every 4 s; sync them
  throttled, on pause and chapter change).
- Browser sessions, next: photos and recordings from the phone (media on
  demand over the link); the browser's AI help with the phone's key;
  read only while the phone is away (AC-26); "Saved on this device" and the
  sidebar's "On this device" should name the phone in a browser; a Hino
  devices icon (Linked Devices uses LinkIcon); deploy the Worker; then
  Android's foreground service and the iPhone ping (step 5).
- Linked devices (spec 0005 steps 1 and 6, 16 Oct): space and ID on every
  app, Link This Device / Add a Device, relay sync through the room. The
  TECNO and the Linux app paired by code and showed each other online; the
  content check (notes arriving both ways) is still owed: earlyoom on this
  Chromebook kills bun, node and workerd when memory runs low, which ended
  the run. Close Chrome tabs or the Android build first. Next: direct links
  on the same network, mDNS (AC-27), nearby devices matched by the room (same
  public address, like PairDrop), then tag v0.2.0 for Play closed testing and
  TestFlight.
- Play Console (16 Oct): every app content declaration is done (no ads,
  13+, content rating Everyone, data safety: name, photos, recordings and
  user content, optional, nothing shared) and the store listing is saved.
  Owed: check v0.2.0 on both phones and promote it to closed testing,
  allowing Google's crawler on pherus.org (the privacy link returned 403 to
  Google, likely Bot Fight Mode), content rules and reporting for published
  notes before production, a dedicated data deletion page. Apple: choose
  the build and add it for review when ready.
- Owner, 16 Oct: the desktop window can't be dragged and its corners aren't
  rounded the macOS way (the whole window, not the web view).
- Owner, 16 Oct: on a phone, Enter at the end of a heading doesn't give a
  paragraph (or a subheading, then a paragraph); reproduce on the TECNO.
- Owner, 16 Oct: show the account (space) ID on each device, so the person
  recognises themselves on their other devices (spec 0005 step 1).
- Continue "Queued from the 15 October review" in docs/STAGES.md, and
  fold in the owner's evening notes there (reading and listening, natural
  voice only, image editing, the iOS keyboard bar, Hino gaps, Wallet,
  Lock). Start fresh is done; next is 7 (slash commands, hashtags,
  reminders from a line), then 8 onward. Then spec 0005 (linked devices),
  optional PassID, the person's own cloud, AirDrop-like sharing, the
  torrent-like network; desktop packaging (deb through apt, Windows) last.
- Untested so far: shared-note media between two real devices; read mode
  and the caret fix on an iPhone (TestFlight 0.1.8 has them).
- Hino gaps go upstream in `~/pherus/hino`, then publish (bump the UI
  version, add a CHANGELOG entry, push, `gh workflow run publish.yml -f
  package=ui` there; npm can take a few minutes to serve it).

Right after the store work (9 October):

- iOS export compliance: App Store Connect has no encryption document
  (only "Upload"), so `Info.ios.plist` must not set
  `ITSAppUsesNonExemptEncryption`: set to true without a document's code,
  altool rejects the upload ("Invalid Export Compliance Code", v0.1.6).
  Each build asks in TestFlight instead (standard encryption, not in
  France). Uploading a document later would give a code to add with the key.
- Fill the App Store page from `docs/store/listing.md` and the
  screenshots.
- Tag a new release (`v0.1.6`) and check on both phones: TestFlight shows
  the new version, About shows it, the natural voice and Whisper download
  and play, the notes list swipes and hold-and-slide selection.
- Check the phone's own voices on Android: TextToSpeech through the bridge
  (`AndroidSpeech.kt`, `www/src/platform/android-speech.ts`, the `android`
  voice provider) builds but has not been heard on a phone. iOS device
  voices sound poor in the WebView; the natural voice is the answer there.
- Owner idea (10 Oct): "Add to Notables" from anywhere: long press or
  right click text, a link or a page in other apps or the browser and save
  it to a note with a link to its source. Needs an iOS share extension, an
  Android share and text selection target (ACTION_SEND, PROCESS_TEXT), and
  a desktop browser extension. Not designed yet; `/architect` it first.
- Dismiss the glib Dependabot alert (GTK3 under Tauri on Linux, no fix
  available).

Network (accepted 15 October, no code yet): sync across your own devices
without an account, encrypted end to end, Cloudflare only passing data
through, people by a separate public ID, opt-in public sharing. Read
[ADR-0007](docs/adr/0007-linked-devices-pass-through-network.md) first.
Stage A is spec [0005](docs/specs/www/0005-linked-devices/index.md),
accepted with all answers; `/develop` starts at its step 1 once the
Android, Hino and fresh start items ahead of it are done.

The long plan, stage by stage, is in [docs/STAGES.md](docs/STAGES.md).
Resume from its first unfinished stage.


- Android: the startup notification check, export to content:// locations, an x86_64 build for ChromeOS.
- Mobile testing: calendar pinch zoom and book contents on real phones.
- Translate the remaining screens.
- Whisper while recording (streaming, native).
- Pherus PassID: optional sign-in, cloud backup, and a relay for sharing
  when peers aren't online together (ADR-0005, 0006).
- Generate the mobile projects, wire in the native widgets, and test
  notifications and widgets on real devices.
- Learning: lessons, flashcards, tutoring notes.

## Agent tooling

One home for every AI tool: `AGENTS.md` files hold the instructions
(`CLAUDE.md` beside each is a symlink to it), and `.agentic/skills/` holds
the project skills. `.claude/skills` and `.agents/skills` (Codex, the
`skills` CLI, OpenCode) are symlinks to it; add new tools the same way.
General skills live in your home folder, not here.

## Context files

- `.agentic/skills/hino/SKILL.md`: Hino's rules and every component's import (from https://hino.pherus.org/skills/hino/SKILL.md). Read before touching any UI; fix gaps upstream in `~/pherus/hino`.
- [www/src/features/wallet/AGENTS.md](www/src/features/wallet/AGENTS.md): wallet requirements, rejected prototype, physical Android evidence and resume checkpoint. Read before continuing wallet work.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
