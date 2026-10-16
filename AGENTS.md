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
  aarch64 only: `ort` has no prebuilt ONNX Runtime for x86_64 Android.
  On Android, binary IPC bodies arrive as JSON arrays (`src/ipc_bytes.rs`).
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
git tag v0.2.0 && git push origin v0.2.0          # Google Play and TestFlight
git tag android-v0.2.0 && git push origin android-v0.2.0   # Play only
git tag ios-v0.2.0 && git push origin ios-v0.2.0           # TestFlight only
gh workflow run ci.yml                            # the web checks, on demand
```

The tag gives the version; the run number gives the build number, so every
upload is newer than the last.

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
