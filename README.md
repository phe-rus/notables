# Notables

Notes, journals, stories and books — written, recorded and read on every
device you own. Private by default, published when you choose.

Notables is one app for **iOS, Android, macOS, Windows, Linux and the web**,
built from a single codebase. It works fully on your device with no account;
sharing and cloud backup are optional.

## Features

- **A writing surface made for words** — a custom editor with titles,
  headings, quotes, lists, checklists, highlights, links, photos and audio
  clips, plus Markdown shortcuts and a floating format bar
- **Your library** — journal, stories, articles, manga, lessons and plans,
  with search, pinning and Apple Notes–style grouping
- **Books** — gather notes into books and read them with real page turns:
  two-page spreads on large screens, single pages on phones
- **Publishing** — turn any note into a public page with hearts, likes,
  ratings, view and read counts; update or unpublish whenever you like
- **Local-first** — everything is stored on the device and works offline

See the [roadmap](docs/ROADMAP.md) for what comes next: recording with
on-device transcription, the freeform canvas, device-to-device sharing,
templates (receipts, invoices, social posts) and optional cloud backup.

## Stack

| Concern  | Choice                                                         |
| -------- | -------------------------------------------------------------- |
| Monorepo | Bun workspaces + Turborepo                                     |
| App      | React, TanStack Router and Start, Tailwind CSS v4, motion      |
| Native   | Tauri 2 — one Rust core for iOS, Android and desktop           |
| Server   | TanStack Start server functions on Cloudflare Workers, D1, R2  |
| Editor   | Custom editor on Lexical, synced through Yjs                   |
| Icons    | Hugeicons                                                      |

## Repository

```
www/              the app — web and every Tauri target
  src/
    routes/       file routes (app, books reader, public pages)
    features/     library, notes, books, publishing, reader
    server/       server functions and their services
    platform/     storage, identity and native bridges
  src-tauri/      the native shell (Rust)
  migrations/     D1 schema
shared/
  core/           domain model and note document layout
  editor/         the Lexical-based editor
  sync/           local-first persistence and sync engine
  tokens/         design tokens
  ui/             components, utilities and motion
docs/             architecture, decisions (ADRs) and roadmap
```

## Getting started

Requirements: [Bun](https://bun.sh) 1.3+ and Node.js 22.

```sh
bun install
cd www && bun run db:migrate   # create the local D1 database
bun run dev                    # http://localhost:3000
```

Native apps additionally need Rust, the
[Tauri prerequisites](https://tauri.app/start/prerequisites/), and clang
and CMake to build whisper.cpp for on-device transcription. On Debian,
Ubuntu or ChromeOS Linux:

```sh
sudo apt install -y build-essential curl wget file pkg-config libssl-dev \
  libwebkit2gtk-4.1-dev libxdo-dev libayatana-appindicator3-dev librsvg2-dev \
  clang libclang-dev cmake
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

```sh
cd www
bun run tauri dev              # desktop
bun run tauri ios dev          # iOS simulator (macOS + Xcode)
bun run tauri android dev      # Android device or emulator
```

Android builds need a JDK, the Android SDK and NDK, and the Rust Android
targets. Run `bun run tauri android init` once to generate the project:

```sh
export JAVA_HOME=/path/to/jdk         # e.g. Android Studio's jbr folder
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/<version>"
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

The native apps keep notes in SQLite and photos and recordings as files
in the app's data folder (`~/.local/share/org.pherus.notables` on Linux).

## Checks

```sh
bun run check    # lint, typecheck and tests across the workspace
bun run build    # production build of the web app
```

## Deploying the web app

```sh
cd www
bunx wrangler d1 create notables          # once; put the id in wrangler.jsonc
bunx wrangler r2 bucket create notables-media
bunx wrangler d1 migrations apply DB --remote
bun run deploy
```

Set `VITE_PUBLIC_URL` to the deployed origin when building native apps so
share links and publishing reach the Worker.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/adr/README.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE) © Pherus
