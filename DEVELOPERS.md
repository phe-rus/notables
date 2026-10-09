# Developing Notables

Everything needed to build, run, check and ship Notables. For what the app
is, see the [README](README.md); for how changes are proposed, see
[CONTRIBUTING](CONTRIBUTING.md).

## Stack

| Concern  | Choice                                                              |
| -------- | ------------------------------------------------------------------- |
| Monorepo | Bun workspaces and Turborepo                                        |
| App      | React 19, TanStack Router and Start, Tailwind CSS v4, motion        |
| Native   | Tauri 2: one Rust core for iOS, Android, macOS, Windows and Linux   |
| Storage  | SQLite and media files on device; Yjs documents for sync            |
| Server   | TanStack Start server functions on Cloudflare Workers, D1 and R2    |
| Editor   | A custom editor on Lexical, synced through Yjs                      |
| Speech   | whisper.cpp for transcription, ONNX Runtime for natural voices      |
| Icons    | Hugeicons                                                           |

## Repository

```
www/                  the app: web, and the frontend of every Tauri target
  src/
    routes/           file routes (the app, readers, public pages)
    features/         one folder per feature: components, lib, store, model
    components/       shared app components
    platform/         storage, identity, haptics and native bridges
    server/           server functions and their services
    i18n/             translations (en, fr, es, pt, sw, ar)
  src-tauri/          the native shell (Rust)
    gen/android/      the Android project
    widgets/          home-screen widget sources not yet in a project (iOS)
  migrations/         D1 schema
packages/
  notable-core/       models, invoicing, calendar recurrence
  pluraliti/          the Lexical-based editor
  sync/               Yjs persistence and the peer-to-peer mesh
  tokens/             design tokens (theme.css is generated)
  ui/                 components, haptics, motion, Hugeicons
docs/                 architecture, decisions (ADRs), specs and roadmap
```

## Web

Requirements: [Bun](https://bun.sh) 1.3+ and Node.js 22.

```sh
bun install
cd www && bun run db:migrate   # create the local D1 database
bun run dev                    # http://localhost:3000
```

## Desktop

Native builds need Rust, the
[Tauri prerequisites](https://tauri.app/start/prerequisites/), and clang
and CMake for whisper.cpp. On Debian, Ubuntu or ChromeOS Linux:

```sh
sudo apt install -y build-essential curl wget file pkg-config libssl-dev \
  libwebkit2gtk-4.1-dev libxdo-dev libayatana-appindicator3-dev librsvg2-dev \
  clang libclang-dev cmake
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

```sh
cd www
bun run tauri dev
```

On Linux a leftover `notables` process makes new launches exit silently
(the app is single instance): `pkill -f target/debug/notables`.

The native apps keep notes in SQLite, and photos and recordings as files,
in the app's data folder (`~/.local/share/notables.pherus.org` on Linux).

## Android

Needs a JDK (Android Studio's `jbr` works), the Android SDK, an NDK and
the Rust target for phones. The project lives in
`www/src-tauri/gen/android`.

```sh
export JAVA_HOME=/path/to/android-studio/jbr
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/<version>"
# whisper.cpp builds with CMake, which finds the NDK through ANDROID_NDK,
# and its bindings need the NDK's headers rather than the system's.
export ANDROID_NDK="$NDK_HOME"
export BINDGEN_EXTRA_CLANG_ARGS_aarch64_linux_android="--sysroot=$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot"

rustup target add aarch64-linux-android
```

```sh
cd www
bun run tauri android build --debug --apk --target aarch64
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

- Build for `aarch64` only: ONNX Runtime has no prebuilt library for
  x86_64 Android. Intel Chromebooks run the arm64 build through their ARM
  translator, but it can't load the app's native library yet.
- Android's WebView sends binary IPC bodies as JSON arrays, so commands
  that take bytes read both forms (`src-tauri/src/ipc_bytes.rs`).
- To inspect the running app, forward its WebView's DevTools socket and
  open `chrome://inspect`, or talk to it over the DevTools protocol:

  ```sh
  adb forward tcp:9333 localabstract:webview_devtools_remote_$(adb shell pidof notables.pherus.org.debug)
  ```

## iOS

```sh
cd www
bun run tauri ios init   # once, on macOS with Xcode
bun run tauri ios dev
```

The iOS project isn't in the repository yet; its widget sources wait in
`www/src-tauri/widgets/apple` with setup steps.

## Checks

What CI runs, from the repository root:

```sh
bun install --frozen-lockfile
bun run lint        # Biome
bun run typecheck   # every package, including tests
bun run test        # every package
bun run build
(cd www && TAURI_ENV_PLATFORM=linux bun run build)   # native builds prerender "/" on the server
cd www/src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test --lib
```

## Deploying the web app

```sh
cd www
bunx wrangler d1 create notables-database   # once; put the id in wrangler.jsonc
bunx wrangler r2 bucket create notables-bucket
bunx wrangler d1 migrations apply notables-database --remote
bun run deploy
```

Set `VITE_PUBLIC_URL` to the deployed origin when building the native apps,
so share links and publishing reach the Worker. Model packs (Whisper and
the natural voices) are published to R2 with `bun run models:publish <id>`.

## Conventions

- Code is organised by feature, with no flat dumping grounds; match the
  surrounding style and comment density.
- Every string people see goes through `t()`, with the key added to all six
  catalogs in `www/src/i18n/messages`; a test checks they match.
- No em dashes anywhere, in code, text or docs; a test enforces it.
- Respect each platform's conventions: its fonts, haptics, keyboard,
  system bars, dark mode and text size.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/adr/README.md)
- [Specs](docs/specs)
- [Roadmap](docs/ROADMAP.md)
