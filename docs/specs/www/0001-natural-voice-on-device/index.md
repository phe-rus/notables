# 0001. Natural voice on the device with Supertonic, served from R2

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Read aloud gets a natural, calm voice that runs fully on the device, with no account, no key and no cost. The voice model (Supertonic 3, an open model of about 99M parameters) downloads once, quietly, from `notables.pherus.org/models`, which serves files from the R2 bucket. It speaks English, French, Spanish, Portuguese and Arabic; Swahili keeps the best device voice for now. The same download system also takes over the Whisper model, and the bucket and database get their final names.

## Requirements

**User stories**:
- As a reader, I want read aloud to sound like a calm, real person without paying or signing in, so that listening to my notes and books is pleasant.
- As a reader on a phone, I want the voice to download on Wi-Fi by itself, so that I never think about it and never lose my data plan to it.
- As a reader who reads offline, I want the voice to work with no connection once it is downloaded.
- As someone short on space, I want to see what the voice takes up and delete it.

**Acceptance criteria**:
- **AC-1**: On a fresh install of a native app, on first launch with an unmetered connection, the natural voice pack downloads in the background with no prompt, and Settings > Listening shows its progress.
- **AC-2**: On phones, the automatic download waits for an unmetered connection unless "Download over mobile data" is on. Where the app cannot tell the connection type, it treats it as metered. Desktop treats every connection as unmetered.
- **AC-3**: Once the pack is ready and no voice was chosen (`voiceId` is null), read aloud for content whose language (see Language source below) is English, French, Spanish, Portuguese or Arabic uses the natural voice in its default calm female style, with networking off and no key.
- **AC-4**: Pressing play on a line of up to about 200 characters starts speech within about one second on a mid range laptop, measured with the model warm (it loads when a read aloud surface opens); later lines play with no gap.
- **AC-5**: A book whose language is Swahili (`sw`), or any language the pack does not cover, reads with the best device voice, and the narration bar's voice picker does not offer the natural voice for it. Where no device voice exists for that language either, the narrator shows a translated "No voice for this language" message.
- **AC-6**: A voice the person chose themselves (device or Gemini) is never replaced automatically.
- **AC-7**: An interrupted download resumes from where it stopped. A file whose SHA-256 checksum does not match the manifest is discarded and never loaded. A pack counts as installed only when every file matches.
- **AC-8**: Settings > Listening lists each pack ("Natural voice" and "Transcription") with its size and state (not downloaded, waiting for Wi-Fi, downloading with percent, ready, update available, not enough space, failed), with Download, Delete, Retry and the "Download over mobile data" switch. Deleting frees the space, and read aloud falls back to device voices.
- **AC-9**: When the manifest lists a newer version of an installed pack, it downloads in the background on an unmetered connection, the next read aloud session uses it, the old version is deleted afterwards, and a session already playing is never interrupted.
- **AC-10**: Whisper's model downloads from the same host through the same manifest. A `ggml-base.bin` already on the device from before is adopted without downloading again when its checksum matches.
- **AC-11**: `GET` and `HEAD` on `https://notables.pherus.org/models/<path>` serve files from the `models/` prefix of the R2 bucket, with byte range support (including suffix ranges, and 416 with `Content-Range: bytes */<size>` for unsatisfiable ones), a long immutable `Cache-Control` for versioned files and a short one for `manifest.json`. Any path that leaves `models/` or contains `..` returns 404.
- **AC-12**: The pace setting changes the natural voice's speed without changing its pitch, within a supported range measured in Slice 1 (about 0.8 to 1.5); paces outside it are clamped to the nearest end.
- **AC-13**: The web build keeps device voices and never downloads the pack. The `SpeechEngine` interface and the manifest stay as they are when a browser runtime is added later.
- **AC-14**: `wrangler.jsonc`, the README and the setup commands use the R2 bucket `notables-bucket` and the D1 database `notables-database`.
- **AC-15**: The voice's license (OpenRAIL-M) opens from its pack row in Settings > Listening.
- **AC-16**: Every new string goes through `t()` and exists in all six catalogs.

## Decision

**Chosen option**: Option 1: Supertonic 3 in the Rust core with ONNX Runtime, files on R2 behind the existing Worker.

Read aloud gains a third speech engine, `DeviceNeuralSpeech`, backed by Supertonic 3 running natively through the `ort` crate (Rust bindings for ONNX Runtime); one versioned model download system, served from `notables.pherus.org/models`, delivers it and the Whisper model.

**Implementation skills**: `cloudflare` (`.claude/skills/cloudflare/`) for the R2 binding, Worker caching and range reads · `tanstack-start` (`.claude/skills/tanstack-start/`) for the server file route.

Recommendations settled in this spec (pick, why, runner up):
- **R2 binding name**: keep `MEDIA`, change only `bucket_name`. Why: no code churn for publications. Runner up: rename the binding to `BUCKET`.
- **Model file precision**: publish fp32 first, measure, and publish an fp16 or int8 build only if it sounds the same in a blind listen. Why: quality is the point of this feature. Runner up: int8 from the start.
- **How audio reaches the WebView**: `voice_synthesize` returns raw little endian f32 samples as a binary IPC response, played through Web Audio like Gemini voices. Why: reuses `normalizePeak` and the buffered playback already written. Runner up: play natively from Rust (`cpal`), which would duplicate pause, seek and volume handling.
- **Where the auto download policy lives**: in Rust (`models::auto`), started from the frontend after mount. Why: the root is prerendered on the server, so only mount time code may touch native APIs. Runner up: a Rust setup hook that ignores the mobile data setting kept in the WebView.
- **Retries**: one automatic attempt per launch, plus another when the app returns to the foreground, plus the Retry button. No background retry loop. Why: simple and battery friendly. Runner up: exponential backoff in a long lived task.
- **Manifest freshness**: fetched at most once per launch and at most once every 24 hours.
- **Language source**: the narrator's `lang` is the content language, not the interface language. Books use their own `language` metadata, falling back to the app language; notes use the app language. Per note or detected language is out of scope. The narration bar's picker lists voices for the content language; the Settings picker lists voices for the app language. The base subtag picks the Supertonic language code. A language missing from the pack makes the engine list say "not available" for it, so ranking falls through to device voices.
- **Ranking**: `rankVoices` adds 2 for `provider === "device-neural"` and 1 more for the `defaultStyle` voice, so the natural voice beats an exact locale "Enhanced" device voice and its default style wins over the other styles. A unit test proves both.
- **Style names**: each style's `name` is a proper name and is never translated (like Gemini's "Kore"); its descriptor comes from `t()` by style id, with `t("listening.naturalVoice")` as the fallback for an unknown id.
- **Default style**: the calmest female style shipped with the pack, chosen by listening during the build and written into the manifest as `defaultStyle`, so it can change without an app update.
- **Pack compatibility**: every pack carries an integer `format`. The app declares the formats it supports per pack id and ignores any version with an unknown format, keeping what is installed. An unknown manifest `schema` means: keep local state and offer no updates.
- **Versioned synthesis**: `voice_info` returns `version`; `DeviceNeuralSpeech` captures it when built and passes it to every `voice_synthesize`. Rust keeps at most two versions loaded (least recently used is dropped) and loads a requested version on demand. `Narrator.reconfigure` reuses the captured version for the rest of the session.
- **Warm and cold**: `voice_warm` loads the sessions when a read aloud surface mounts; Rust unloads them after 10 minutes with no synthesis, so phones do not hold the model in memory.
- **Long and odd text**: Rust splits text over 300 characters at clause punctuation, then at whitespace, synthesises the pieces and joins them with about 100 ms of silence. Characters outside the model's vocabulary are stripped or replaced.
- **Threading**: `voice_synthesize` is an async command; the sessions sit behind a `Mutex` and inference runs in `spawn_blocking`, so `prepare()` and `speak()` run one after the other. `ort` is pinned to an exact version.
- **Delete safety**: Delete cancels a running download (a cancellation token beside the per pack lock), removes `*.part` files, waits for any synthesis in progress, drops the loaded sessions, then deletes the folder. If the delete fails (Windows), the folder is marked and removed at the next launch. A later `voice_synthesize` fails with a typed "not installed" error, and `use-narration` rebuilds the engine through `engineFor`, which falls back to device voices.
- **Progress**: one channel only, the `models://status` event, at most about four per second. `receivedBytes` is the sum of finished files and `*.part` sizes over the pack total; verifying shows as indeterminate.
- **Worker caching**: no Workers Cache API. The route serves straight from R2 with `Cache-Control` and `ETag`; R2 egress is free, and mixing the cache with range requests is the riskiest part of the route. Edge caching can be added later if metrics call for it.
- **Large uploads**: the publish script always passes `--remote`, and uses R2's S3 API with multipart upload for any file over 300 MB.

## Rationale

Reasoning, options, and references: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (no D1 tables; files on R2, files and two small records on the device):

| Where | Entity | Fields | Rules |
|---|---|---|---|
| R2 `models/manifest.json` | Manifest | `schema: 1` (req), `packs: Pack[]` (req) | Short cache; the only file without a version in its path |
| (in manifest) | Pack | `id` ("supertonic-3", "whisper-base") (req, unique), `kind` ("voice" or "transcription") (req), `version` (req, string, e.g. "2026.10.1"), `format` (req, integer), `languages: string[]` (req for voice), `defaultStyle` (req for voice), `styles: {id, name}[]` (req for voice), `sampleRate` (req for voice), `license: {name, path}` (req), `files: File[]` (req) | `version` changes whenever any file changes; `format` changes whenever the app's loading code must change |
| (in pack) | File | `path` (req, relative to `models/<id>/<version>/`), `bytes` (req), `sha256` (req, hex) | Immutable once published |
| R2 `models/<id>/<version>/...` | Pack files | ONNX graphs, config JSON, style JSON, `LICENSE` | Never overwritten; a new version gets a new folder |
| Device `models/<id>/<version>/` | Installed files | as above | Loaded only after every checksum matches |
| Device `models/installed.json` | Installed record | map of pack id to `{version, bytes, installedAt}`, plus `pendingDelete: string[]` | Written by temporary file and rename; one current version per pack. Only installed versions persist; `waiting`, `failed` and `no-space` live in memory and are recomputed at launch |
| Device `models/manifest.json` + `manifest.meta.json` | Cached manifest | the last fetched manifest; `{fetchedAt}` | Used offline and for the 24 hour freshness rule |
| Device `*.part` | Partial download | bytes received so far | Resumed with a `Range` request; deleted on checksum mismatch, when larger than the manifest's `bytes`, or at launch when it belongs to a version no longer in the manifest |
| Device localStorage `notables:narration` | Narration settings | `voiceId: string \| null`, `rate: number`, new `downloadOnMobileData: boolean` (default false) | `null` voice means best available, which puts the natural voice first |

**State transitions** (per pack, on a device):
`absent` → `waiting` (metered connection and switch off) → `downloading` → `verifying` → `ready`.
`downloading` → `failed` (with a reason: `network`, `checksum` or `server`, shown through `t()`) or `no-space`; both return to `downloading` on Retry, the next launch, or returning to the foreground.
`verifying` → `failed` on checksum mismatch (the file is deleted first).
`ready` → `updating` (newer version in manifest) → `ready` on the new version; the old folder is deleted at the next launch.
`ready` → `absent` on Delete. `downloading` → `absent` on Delete (the download is cancelled first).

**API surface**:

| Endpoint / command | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/models/$` (Worker, TanStack Start server file route) | GET, HEAD | path (req), `Range` header (opt) | file bytes (headers only for HEAD, from `MEDIA.head()`), `ETag`, `Content-Range`, `Cache-Control` | public | 404 unknown or outside `models/`, 416 unsatisfiable range |
| `models_status` (Tauri) | invoke | none | `PackStatus[]`: id, kind, state, installedVersion, availableVersion, bytes, receivedBytes | app local | manifest unreachable (returns local state with `availableVersion: null`) |
| `models_download` (Tauri) | invoke | id: string (req) | final `PackStatus` (progress arrives as `models://status` events) | app local | unknown pack, no space, network, checksum |
| `models_auto` (Tauri) | invoke | allowMetered: bool (req) | none (progress arrives as `models://status` events) | app local | never throws; failures become pack states |
| `models_delete` (Tauri) | invoke | id: string (req) | none | app local | none; cancels a running download, waits for synthesis in progress, and defers to next launch if the OS refuses |
| `whisper_model_status`, `whisper_download_model` (Tauri, existing) | invoke | unchanged | unchanged | app local | thin wrappers over `models::*("whisper-base")`, so the frontend does not change |
| `voice_info` (Tauri) | invoke | none | version, languages, styles, defaultStyle, sampleRate, or null when not installed | app local | none |
| `voice_warm` (Tauri) | invoke | none | none | app local | never throws; loads the installed version if not loaded |
| `voice_synthesize` (Tauri) | invoke | text: string (req), lang: string (req), version: string (req), style: string (opt), speed: number (req) | binary f32 samples at `sampleRate` | app local | typed `not-installed`, unsupported language, model load failure |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Auto download | whether the connection is metered | Desktop: always unmetered. Phones: a native check added with the mobile projects; until then treated as metered |
| Auto download | whether mobile data is allowed | `downloadOnMobileData` from narration settings, passed as `allowMetered` |
| Auto download | which packs download automatically | Packs with `kind: "voice"`; transcription stays on demand from recording |
| Download | file URLs | `MODELS_BASE_URL` constant + `<id>/<version>/<path>` from the manifest |
| Download | expected size and checksum | manifest `files[].bytes` and `files[].sha256` |
| Download | free space check | the `fs4` crate on the app data volume; needed = sum of `files[].bytes` minus bytes already in `*.part`, plus the larger of 10% or 50 MB; checked before every download, including updates |
| Download | which versions are eligible | manifest packs whose `format` the app supports |
| Settings list | pack name and description | i18n keys per pack id, not the manifest |
| Settings list | size, percent | manifest `bytes` (the cached manifest when offline; no size and Retry when neither exists); `receivedBytes` from `models://status` |
| Settings list | update available | `availableVersion` differs from `installedVersion` |
| Voice picker | natural voice entries | `voice_info().styles`, one `Voice` per style, `provider: "device-neural"`, `offline: true`, `natural: true`, `lang` from the picker's language (content language in the narration bar, app language in Settings) when in `languages` |
| Voice picker | style label | style `name` as a proper name, descriptor from `t()` by style id |
| Read aloud | which voice when `voiceId` is null | `rankVoices` with the `device-neural` (+2) and `defaultStyle` (+1) bonuses |
| Read aloud | content language | book `language` metadata, else the app language; notes use the app language |
| Read aloud | Supertonic language code | base subtag of the content language |
| Read aloud | model version | `voice_info().version`, captured when the engine is built |
| Read aloud | style | the chosen voice id, else manifest `defaultStyle` |
| Read aloud | speed | narration settings `rate`, clamped to the range measured in Slice 1, passed as Supertonic's speed, with `playbackRate` left at 1 |
| Read aloud | prepared audio cache key | `text|lang|style|speed|version` |
| Read aloud | sample rate | `voice_info().sampleRate` from the manifest |
| License link | license text | installed: `models/<id>/<version>/LICENSE` on the device, in an in app sheet; not installed: `MODELS_BASE_URL/<id>/<version>/<license.path>` from the cached manifest, in the system browser |
| Auto download | when it runs | after mount, and on `visibilitychange` to visible at most once per 10 minutes, only when `isTauri()` |
| Worker | cache lifetime | `Cache-Control` only: `manifest.json` 5 minutes; anything else one year, immutable |

**Key invariants**:
- A model file is loaded only from a version folder whose every file matched its checksum.
- Published files under `models/<id>/<version>/` never change; changing a file means a new version.
- At most one download per pack runs at a time (a per pack lock in Rust); a second request joins the running one.
- A voice the person chose is never rewritten by the app.
- The Worker exposes nothing outside `models/`.
- No network request is ever made for speech once the pack is installed.
- The app never loads a pack version whose `format` it does not support.
- A folder is deleted only after its sessions are unloaded and no download writes into it.

**Security model**: Model files are public and read only; no user data passes through this feature. The Worker route normalises the path and rejects `..`, backslashes and anything outside `models/`. Integrity comes from SHA-256 checksums in the manifest, fetched over HTTPS from the same origin; a tampered or truncated file is never loaded. Repeated downloads are cheap because R2 egress is free; a WAF rate rule on `/models/` is a follow-up if abuse shows up. Compliance scope: none. OpenRAIL-M use restrictions travel with the model through the bundled `LICENSE`.

**Configuration required**:
- `MODELS_BASE_URL` (Rust constant, not an env var): `https://notables.pherus.org/models`.
- R2 bucket `notables-bucket` and D1 database `notables-database` must be created (`wrangler r2 bucket create notables-bucket`, `wrangler d1 create notables-database`) before the first deploy; the real `database_id` goes into `wrangler.jsonc`.
- The publish script uses the wrangler login already used for deploys, always with `--remote`. Files over 300 MB go through R2's S3 API with multipart upload, which needs an R2 API token in the publisher's local environment (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`); it is never shipped and never used by the app or the Worker.

**Critical test scenarios**:
- Happy path: fresh Linux build, first launch online, the pack downloads, reading a French book aloud with Wi-Fi then off uses the natural voice, verifies **AC-1**, **AC-3**, **AC-4**.
- Failure case: kill the network halfway, relaunch, the download resumes from the partial file; corrupt one byte of a finished file, it is rejected and downloaded again, verifies **AC-7**.
- Failure case: a book with `language: sw` reads with a device voice and the narration bar shows no natural voice for it, verifies **AC-5**.
- Ranking: with an exact locale "Enhanced" device voice present, `rankVoices` puts the natural voice's `defaultStyle` first, verifies **AC-3**.
- Range: `bytes=-100` returns 206 with the last 100 bytes; `bytes=999999999-` returns 416; HEAD returns headers with no body, verifies **AC-11**.
- Delete: delete during a download and during playback; the download stops, playback falls back to a device voice at the next line, and the folder is gone (or gone after relaunch on Windows), verifies **AC-8**.
- Permission: `GET /models/../wrangler.jsonc` and `GET /models/%2e%2e/x` return 404; a publication media key under the bucket is not reachable through `/models/`, verifies **AC-11**.
- Update: publish a new version while a book is playing; playback continues uninterrupted and the next session uses the new version, verifies **AC-9**.

## Build plan

Tracer Bullet: the first slice puts one thin thread through every layer (R2, Worker, Rust download, Rust synthesis, the speech engine, the picker) on Linux desktop. Later slices thicken it.

**Slice 1: one voice, end to end on desktop**
1. Rename the bucket to `notables-bucket` and the database to `notables-database` in `www/wrangler.jsonc` (keep the `MEDIA` and `DB` bindings), the README setup commands and the D1 migrate commands in docs, satisfies **AC-14**.
2. Move `parseRange` from `routes/media/$publicationId/$mediaId.ts` into `www/src/server/http/byte-range.ts` and reuse it; fix it on the way (suffix ranges return 206, unsatisfiable ranges return 416 with `Content-Range: bytes */<size>`); add the `/models/$` server file route with path checks, an explicit HEAD handler from `MEDIA.head()`, R2 range reads, `ETag` and `Cache-Control`, with no Workers Cache API, satisfies **AC-11**.
3. Add `scripts/models/publish.ts` (`bun run models:publish`): fetch pinned upstream Supertonic 3 files at a pinned revision, compute checksums, upload to `models/supertonic-3/<version>/` with wrangler `--remote` (S3 multipart for files over 300 MB), write `manifest.json` (with `format`) last. Publish the first version, satisfies **AC-1**, **AC-7**.
4. Add `www/src-tauri/src/models/` (manifest fetch and cache, `format` filter, download with `Range` resume and `*.part` validation, checksum verification, `installed.json`, per pack lock with a cancellation token, free space check, `models://status` events) and the `models_status`, `models_download`, `models_delete` commands. Add `ort` (exact version), `sha2` and `fs4` to `Cargo.toml`, satisfies **AC-1**, **AC-7**.
5. Add `www/src-tauri/src/voice/` (async inference in `spawn_blocking` behind a `Mutex`, up to two loaded versions, unload after 10 idle minutes, splitting of text over 300 characters, vocabulary filtering, text to f32 samples with language, style and speed) and the `voice_info`, `voice_warm` and `voice_synthesize` commands, satisfies **AC-3**, **AC-12**.
6. Pull the buffered Web Audio playback out of `GeminiSpeech` into a shared helper, keyed by `text|lang|style|speed|version`, and add `DeviceNeuralSpeech` in `speech-engines.ts` using `prepare()` to synthesise the next line ahead; add the `device-neural` provider, its voices and the ranking bonuses in `voices.ts`; make book narration use the book's `language`; call `voice_warm` when a read aloud surface mounts; catch the typed `not-installed` error in `use-narration` and fall back through `engineFor`, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**.
7. Check AC-4 on the Linux desktop build with the model warm: time from play to first sound, and the gap between lines. If it is over a second, lower Supertonic's step count before anything else. Measure the pace range that still sounds right and set the clamp, satisfies **AC-4**, **AC-12**.

**Slice 2: automatic and manageable**
8. `models_auto` with the metered rule (desktop unmetered, phones metered until the native check exists) and `downloadOnMobileData` in narration settings; call it after mount from the app shell and on `visibilitychange` to visible at most once per 10 minutes, only when `isTauri()`, satisfies **AC-1**, **AC-2**.
9. The packs list in `listening-settings-section.tsx`: states, sizes, Download, Delete, Retry, the mobile data switch and the license link (device file when installed, hosted file otherwise); failure reasons through `t()`; live updates from `models://status`, satisfies **AC-8**, **AC-15**.
10. Updates: compare manifest and installed versions, download the new version beside the old, switch `installed.json`, delete the old folder at next launch; sessions read the version once at start, satisfies **AC-9**.
11. Keep the web build on device voices: the engine list includes `device-neural` only when running in Tauri, satisfies **AC-13**.

**Slice 3: Whisper on the same rails**
12. Publish `whisper-base` through the script, point `transcription/model.rs` at the models module (resolving the path through `installed.json`), keep `whisper_model_status` and `whisper_download_model` as thin wrappers, remove the Hugging Face URL, and adopt an existing `models/ggml-base.bin` lazily on the first status or whisper call (hash in `spawn_blocking`, move into the version folder; delete it on mismatch), satisfies **AC-10**.

**Slice 4: finish**
13. Add every new string to all six catalogs, including style descriptors, failure reasons and "No voice for this language", satisfies **AC-5**, **AC-16**.
14. Run the full pre push checks from `CLAUDE.md`, including `cargo clippy` and the Linux `TAURI_ENV_PLATFORM` build, satisfies **AC-14**, **AC-16**.

## Consequences

**Positive**:
- A natural voice that is free, private and offline for five of the six app languages, and the same voice on every desktop OS, including Linux, which today only has a robotic voice.
- One download system for all models, served from your own domain, so nothing depends on Hugging Face staying up or keeping its paths.
- The same ONNX files and manifest can drive a browser runtime later, so the web build needs no new hosting.
- No GPL code enters the app.

**Negative / tradeoffs**:
- The pack is heavy. About 99M parameters is roughly 400 MB at full precision, so a smaller build matters, and it is far too large to bundle into installers. Real sizes are measured in Slice 1.
- ONNX Runtime adds roughly 10 to 20 MB to every installer, even for people who never use read aloud, and its iOS and Android builds need extra setup that is not proven yet.
- Swahili stays on device voices, which are missing on iOS, so Swahili read aloud there may have no voice at all.
- OpenRAIL-M is not an OSI open source license: its use rules (no harmful uses) must travel with the model and be shown to people.
- Publishing files over 300 MB needs an R2 API token on the publisher's machine.
- Every model download is a Worker request. That's cheap, but it is a cost the public R2 domain option would have avoided, and you chose one domain on purpose.

**Neutral**:
- `wrangler.jsonc` gets new resource names before the first deploy, so nothing needs migrating.
- New pattern: versioned, checksummed packs with a manifest. Future models (better Whisper, Learning features) use it too.

## Follow-up

- [ ] With the mobile projects: add the native metered connection check on Android (`ConnectivityManager`) and iOS (`NWPathMonitor` "expensive"), and prove `ort` runs on both (expect `load-dynamic` or a custom ONNX Runtime build, and an XCFramework on iOS); an int8 or fp16 build is required for phones; measure AC-4 on a mid range phone.
- [ ] Browser runtime: run the same pack with `onnxruntime-web` (WebGPU, WASM fallback), stored in the Origin Private File System, as its own spec.
- [ ] Peer to peer or torrent style model delivery between devices, revisited when downloads need it; R2 behind the Worker already serves worldwide.
- [ ] Swahili: revisit when an open Swahili voice with a license that allows commercial use appears.
- [ ] A WAF rate rule on `/models/` if download abuse shows up.
- [ ] `/sync` should update the `wrangler d1 migrations apply` line in `CLAUDE.md` to the new database name.
