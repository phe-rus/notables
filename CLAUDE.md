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
- `shared/core` (models, invoicing, calendar recurrence), `shared/editor`
  (custom Lexical editor), `shared/sync` (Yjs persistence, peer-to-peer
  mesh), `shared/ui` (components, Hugeicons), `shared/tokens` (design
  tokens; `theme.css` is generated, run `bun run generate` there).
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

- Biome rewrites `"—"` escapes into the literal character; build such
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
- Calendar: plans, birthdays, reminders, repeats; notifications, chime,
  vibration. Phones schedule natively (not yet tried on a device).
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
- Six languages with RTL for Arabic. Main surfaces are translated; some
  deeper screens (invoice editor, importers, readers' minor labels) are
  still English.
- Peer-to-peer sharing with specific people (`features/sharing`,
  `shared/sync/src/peer`, signalling in `www/src/server/signals`,
  migration `0002_signals`). Works only while both devices are online;
  no relay or TURN yet.
- Widgets: floating desktop Today widget (`/widget`, `src-tauri/src/widgets.rs`).
  iOS and Android widget sources are in `www/src-tauri/widgets/` with
  setup steps; never compiled, because `gen/apple` and `gen/android` don't
  exist in the repo yet.

## Next

- Translate the remaining screens.
- Whisper while recording (streaming, native).
- Pherus PassID: optional sign-in, cloud backup, and a relay for sharing
  when peers aren't online together (ADR-0005, 0006).
- Generate the mobile projects, wire in the native widgets, and test
  notifications and widgets on real devices.
- Learning: lessons, flashcards, tutoring notes.
