# Notables, Architecture

Notables is a local-first creative notebook: rich notes, a freeform canvas,
audio recordings with automatic transcription, photo journals, stories,
manga and books. Anything can stay private, be shared with specific people,
or be published publicly, and unpublished again.

This document describes how the system fits together. Individual decisions
and their trade-offs are recorded as ADRs in [`docs/adr`](./adr).

## Goals

1. **Premium feel** on every platform, Apple-level motion, typography and
   restraint.
2. **One stack.** One TypeScript codebase, one Rust core, one Worker.
3. **Local-first.** Fully usable offline. The device holds the source of
   truth for private content; the cloud is a sync peer.
4. **Private by default, public by choice.** Publishing creates a snapshot;
   unpublishing removes it without touching the private original.

## Stack

| Concern              | Choice                                                     |
| -------------------- | ---------------------------------------------------------- |
| Monorepo             | Bun workspaces + Turborepo                                 |
| App UI               | React + TanStack Router, Tailwind CSS v4                   |
| Server               | TanStack Start server functions and API routes             |
| Hosting              | Cloudflare Workers (+ Durable Objects, D1, R2, Workers AI) |
| iOS, Android, desktop| Tauri 2 (Rust core, system WebView)                        |
| Editor               | Custom editor on Lexical, collaborating through Yjs         |
| Sync                 | Yjs CRDTs, one Durable Object per note                     |
| Identity             | None yet, Pherus infrastructure later                     |

There is **no separate API framework** and no separate API service. Server
logic lives in `www` as TanStack Start server functions and API routes, or
in the Tauri Rust core when it belongs on the device.

## Repository layout

```
notables/
├── www/                    the app: web + every Tauri target
│   ├── src/
│   │   ├── routes/         TanStack file routes + API routes
│   │   ├── features/       library, editor, canvas, audio, journal,
│   │   │                   books, publish, social
│   │   ├── server/         server functions, sync Durable Object, D1
│   │   └── platform/       web ↔ Tauri bridges (files, audio, storage)
│   ├── src-tauri/          Rust core for iOS, Android, macOS, Windows, Linux
│   ├── migrations/         D1 schema
│   ├── vite.config.ts
│   └── wrangler.jsonc
├── shared/
│   ├── core/               domain model, schemas, Yjs document layout
│   ├── editor/             custom Lexical editor: nodes, plugins, toolbar
│   ├── ui/                 design-system components
│   ├── tokens/             colors, typography, spacing, motion
│   └── sync/               local-first sync engine + persistence contract
└── docs/                   this file and the ADRs
```

`shared/*` packages contain no app logic and never import from `www`.

## One codebase, two runtimes

```
          ┌─────────────── www (one source tree) ───────────────┐
          │  routes · features · shared/editor · shared/ui       │
          └──────────────┬──────────────────────────┬────────────┘
                         │                          │
            vite build (SSR, Worker)       vite build (SPA, static)
                         │                          │
             Cloudflare Worker                 Tauri 2 shell
     SSR · server fns · API routes      iOS · Android · macOS · Win · Linux
     Durable Objects · D1 · R2 · AI     Rust: SQLite · audio · Whisper · files
```

- **Web:** TanStack Start renders on Cloudflare Workers. Public pages (the
  reader) are server-rendered for speed and link previews.
- **Tauri:** the same routes are built as a static single-page app and
  loaded by the system WebView. Server functions are called over HTTPS on
  the deployed Worker; device capabilities go through Tauri commands.
- `www/src/platform` is the only place that knows which runtime it is in.

## Data: two worlds

The most important boundary in the system
([ADR-0003](./adr/0003-local-first-private-server-authoritative-social.md)):

- **Private content**, notes, canvases, recordings, journals, lives on the
  device. Each note body is a **Yjs** document stored locally (IndexedDB
  today, SQLite via the Rust core next) and, when sync is enabled, kept in
  step through a **Durable Object per note**. Sharing with specific people
  later means granting them access to that Durable Object.
- **Public/social data**, publications, likes, hearts, ratings, comments,
  view and read counts, is server-authoritative in **D1**, with published
  snapshots in **R2**. Until Pherus identity exists, a publication is
  controlled by a secret key returned to the publishing device. Counters and moderation need one source of truth.
- **Publishing** freezes the note's content (the editor's serialized
  document) into a snapshot that the reader page renders on the server.
  **Unpublishing** deletes the snapshot. Neither action modifies the private
  original.

### Visibility

| Visibility | Who can read                                  |
| ---------- | --------------------------------------------- |
| `private`  | Only the owner                                |
| `people`   | The owner plus an explicit list of people      |
| `circle`   | A named group (e.g. Family, Close friends)     |
| `public`   | Anyone, served from a publication snapshot    |

## Content

A note is a Yjs document with these top-level parts (`shared/core`):

| Key          | Type          | Holds                                         |
| ------------ | ------------- | --------------------------------------------- |
| `meta`       | `Y.Map`       | title, kind, surfaces                         |
| `root`       | `Y.XmlText`   | the Lexical document (via `@lexical/yjs`)     |
| `canvas`     | `Y.Map`       | freeform elements: ink, shapes, stickies      |
| `transcript` | `Y.Array`     | time-aligned transcript segments              |

Notes group into **collections** (notebooks, series, manga volumes) and
compile into **books**, ordered chapters with a cover, exportable as EPUB.

## Editor

`shared/editor` is our own editor built on Lexical's core, custom nodes,
our toolbar, our keyboard and Markdown shortcuts, our motion, not a
pre-styled kit ([ADR-0004](./adr/0004-custom-lexical-editor.md)). It binds
to the note's Yjs document through `@lexical/yjs`, so local persistence,
multi-device sync and collaboration share one code path.

## Audio and transcription

1. Record on the device (Rust core on Tauri, MediaRecorder on the web).
2. Transcribe **on-device first** with Whisper in the Rust core, so private
   audio never leaves the device.
3. Fall back to **Workers AI** Whisper when on-device is unavailable.
4. Store segments with timestamps so text and audio stay linked; a narrated
   story becomes a book chapter with one action.

## Identity, sharing and backup

Notables never requires an account
([ADR-0006](./adr/0006-device-first-peer-sharing-optional-backup.md)):

- Everything works on the device alone, with a local identity per device.
- Sharing with specific people is **peer-to-peer**: devices exchange Yjs
  updates directly, torrent-style.
- Signing in with **Pherus PassID** (later,
  [ADR-0005](./adr/0005-identity-via-pherus-later.md)) is optional and
  turns on cloud sync as a **backup and fallback relay**.
- Publishing works without an account; each publication is controlled by
  a secret key held by the publishing device.

## Quality bar

- TypeScript strict mode everywhere; Biome for lint and format.
- Domain logic lives in `shared/*` and is unit tested with `bun test`.
- CI runs lint, typecheck, test and build on every pull request.
- Conventional Commits (see [CONTRIBUTING](../CONTRIBUTING.md)).
