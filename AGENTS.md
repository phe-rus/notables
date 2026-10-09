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
  mesh), and UltraPeach, our design language, in `packages/ultrapeach/`:
  `ui` (components, Hugeicons) and `tokens` (design tokens; `theme.css`
  is generated, run `bun run generate` there). Blush pink is the default.
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
  add new keys to all six catalogs in `www/src/i18n/messages/` (en, fr,
  es, pt, sw, ar). A test checks they all match.

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
- Dev server: `cd www && bun run dev` (port 3000). Desktop app:
  `bun run tauri dev`. On Linux a leftover `notables` process makes new
  launches exit silently (single instance); `pkill -f target/debug/notables`.

## Status (October 2026)

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
  Downloads. Whisper now downloads as the `whisper-base` pack. Not live
  until the packs are published (`bun run models:publish <id>`) and the
  Worker is deployed; the bucket and database rename (AC-14) is still open.
- Four media kinds (spec 0002, built, awaiting `/check verify` and `/test`):
  every item and series is a book, comic, manga or audiobook
  (`books/model/media-kind.ts`, read through `getBookStore().kindOf`),
  with shelves, per kind actions, franchises (`store/franchise-store.ts`),
  parts over chapters (`lib/chapter-outline.ts`), whole series delete
  through Recently Deleted (batch ids), and imports that guess the kind,
  find parts and merge into existing series (`imports/lib/import-targets.ts`).
- Six languages with RTL for Arabic. Main surfaces are translated; some
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
  `haptic()` in packages/ultrapeach/ui; menus and popovers keep to `screenEdges()`.
  Calendar on phones: week strip, back titles, self-scrolling months.
  Open: read aloud has no voice (the WebView has no speechSynthesis
  voices; needs Android TextToSpeech through the bridge); the
  notification permission check is refused at startup (`about:blank`);
  export through the save dialog is untested (content:// paths); ChromeOS
  needs an x86_64 build, which `ort` blocks. Debug the live WebView with
  `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`.

- UltraPeach design language (`packages/ultrapeach`, rules in its AGENTS.md):
  Blush default accent (controls use rose `#d16988`), Dynamic Type text
  styles, radius scale, scoped `data-theme`, platform variants, clear glass
  on Apple, solid floating bars on Android (glass there looked out of place),
  pre-paint appearance script. Tab bar: Notes, Wallet, Invoices, Settings;
  no tab haptics. Sidebar laid out like Claude's (actions and places, then
  notes views, then Pinned and Recents). "All notables" replaces All Notes.
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
  Store screenshots: regenerate with a Playwright script against `bun run
  dev` (iPhone 430x932 at 3x, iPad 1024x1366 at 2x, Android 412x892 at 3x),
  composed with Newsreader headlines and Caveat accents on paper.
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
- Settings: every page tile uses the Appearance lavender.
- pherus.org privacy policy: a "Notables app" section (en, zh, fr) is
  committed in `~/pherus/pherus` but not pushed or deployed until the owner
  reviews it.

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

## Next

Right after the store work (9 October): fill the App Store Connect page
from `docs/store/listing.md` and the screenshots; a notes list preview
length setting (1 to 5 lines, like Mail) instead of the fixed single line;
dismiss the glib Dependabot alert (GTK3 under Tauri on Linux, no fix
available); test 0.1.5 on both phones (camera in setup, bar icons).

The long plan, stage by stage, is in [docs/STAGES.md](docs/STAGES.md).
Resume from its first unfinished stage (now Stage 1, UltraPeach).


- Android: read aloud through TextToSpeech, the startup notification
  check, export to content:// locations, an x86_64 build for ChromeOS.
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

- [packages/ultrapeach/AGENTS.md](packages/ultrapeach/AGENTS.md): the UltraPeach design language: tokens, text styles, materials, platform variants and the component catalog. Read before touching any UI.
- [www/src/features/wallet/AGENTS.md](www/src/features/wallet/AGENTS.md): wallet requirements, rejected prototype, physical Android evidence and resume checkpoint. Read before continuing wallet work.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
