# 0005. Your devices, together: a private space, linking and encrypted sync

**Date**: 2026-10-09
**Status**: Proposed
**Decision record**: Stage A of [ADR-0007](../../../adr/0007-linked-devices-pass-through-network.md) (Proposed). Nothing here is built.

## Summary

You start Notables on any device and it quietly creates your **private space**: a secret that only your own devices ever hold, plus your name. To add a phone, a laptop or the web, the new device shows a QR code and a short code; a device you already have scans it or types it, you check that both screens show the same four words, and the new device receives the secret. From then on every linked device keeps a full copy of everything and stays in step: notes, the library (books, series, calendar, invoices), photos and audio, and later the wallet. Devices talk directly when they can (the same Wi-Fi first), and otherwise through Cloudflare, which forwards encrypted bytes and stores nothing. Settings shows your linked devices and the path each one is using, lets you pick a home device and remove one, and offers version history, a recovery key, and an export you can keep in any folder and import later.

## Requirements

**User stories**:
- As someone with an iPhone, an Android phone and the web, I want to continue on any of them exactly where I stopped, so that switching devices loses nothing.
- As someone who cares about privacy, I want sync to need no account and no server that can read my things.
- As someone at home, I want my devices to sync over my own Wi-Fi, without the internet, when they can.
- As someone who loses a phone, I want to remove it so it gets nothing new, and to recover everything on a new device.
- As a careful person, I want a backup in a folder I choose, and to see and restore earlier versions of a note.

**Acceptance criteria**:
- **AC-1**: On first launch after this ships, the app creates a private space without asking anything: a random 32 byte root secret kept in the system key store on native apps and in IndexedDB (marked persistent) on the web, a space ID derived from it, and the person's name (the existing author name). Existing data joins this space untouched.
- **AC-2**: Settings > Linked Devices lists every device in the space with its name, platform, whether it is online, its path (same network, direct over the internet, through Cloudflare encrypted, or offline with last seen time), and which one is the home device. This device is marked.
- **AC-3**: "Link a Device" on the new device shows a QR code and an eight character code that expire after five minutes. On a linked device, "Add a Device" scans the QR (camera) or accepts the typed code.
- **AC-4**: Linking runs a password authenticated key exchange (PAKE) over the Cloudflare room, so the typed code cannot be guessed offline. Both screens then show the same four words; the person confirms on the linked device, and only then is the root secret sent, encrypted for the new device. Five wrong codes block that pairing attempt.
- **AC-5**: After linking, the new device receives everything: the library document first (so lists appear within seconds), then every note, then photos and audio. Progress shows on the new device.
- **AC-6**: An edit on one online device appears on every other online device of the space within 2 seconds on the same network and within 5 seconds over the internet, for a typical note.
- **AC-7**: Edits made offline, on any number of devices, merge without loss when the devices next meet, in any order (Yjs merge). Nothing is ever stored on Cloudflare: a change waits on its device until another device of the space is online.
- **AC-8**: Every byte that leaves a device is encrypted end to end with keys derived from the root secret (XChaCha20 Poly1305). The Cloudflare room name is derived from the secret, so Cloudflare cannot link a room to a person, and it sees only device ids it cannot read meaning into.
- **AC-9**: Devices on the same network connect directly through WebRTC host candidates, without data going through the internet; otherwise WebRTC over the internet; otherwise the Cloudflare pass-through. The path shown in AC-2 is the one in use.
- **AC-10**: Photos and audio sync by media id in 64 KB chunks with a SHA-256 checksum; a file that fails the check is discarded and asked for again. The home device is asked first; any device holding the file can answer.
- **AC-11**: The person can make any device the home device. A newly linked device fills from the home device when it is online. The home device has no other power: if it is lost, every other device still has everything.
- **AC-12**: "Remove This Device" (from any linked device) removes it from the space and rotates the root secret; the remaining devices get the new secret the next time they connect. A removed device keeps what it already had but receives nothing new, and is told so the next time it opens.
- **AC-13**: Each note keeps version history: a version is recorded when a note goes quiet for two minutes or the app goes to the background, with time and device. "Version History" lists them; restoring one applies it as a new edit that syncs like any other, so nothing is lost.
- **AC-14**: The recovery key (the root secret as 24 words) is shown once during first setup, with a "Save it later" choice, and is always available in Settings > Linked Devices. If it was skipped, the app reminds the person to save it or export once the space has more than one device or a week has passed, and never again after they confirm.
- **AC-15**: "Export Everything" writes a backup folder to any place the person picks (native save dialog, a download on the web): every document, every media file, version history and a manifest, encrypted with a key derived from the root secret. "Import" on any device of the same space merges it in; on a fresh install, "Restore from Backup" asks for the recovery key, then creates the space from the backup. Importing an older backup never removes newer work.
- **AC-16**: Preferences sync to every device (appearance, accent, text size, fonts, notes list, sidebar order, listening, reminders, language). Only what belongs to one device stays on it: haptics on or off, window and sidebar width, the home device choice is shown but set per space, and system permissions. A change made on one device appears on the others like any edit.
- **AC-20**: The wallet syncs between linked devices (encrypted records, the newest change wins per card). A wallet password stays per device: setting one on a device protects that device only, and another device does not need it.
- **AC-21**: Everything runs on Cloudflare's free plan. The pass-through carries only document frames; photos and audio travel only over direct paths and wait otherwise. The Durable Object uses the SQLite backed class the free plan requires, with hibernation, and stores nothing.
- **AC-17**: The web build warns once that a browser can lose its data after a week without a visit (Safari) and suggests linking a native device; it is never chosen as home device automatically.
- **AC-18**: Everything works with no network at all on a single device, exactly as today.
- **AC-19**: Every new string goes through `t()` in all seven catalogs; nothing new uses an em dash.

## Decision

**Chosen option**: one encrypted sync engine in `packages/sync` that carries every document over interchangeable transports (WebRTC first, a Cloudflare Durable Object pass-through second), with a root secret per space and a PAKE pairing. See [rationale.md](rationale.md) for the options weighed.

**Implementation skills**: `cloudflare` (Durable Objects with WebSocket hibernation, Worker routes) · `tanstack-start` (server routes) · `tauri` and `tauri-mobile` (key store, camera scan, native save dialog) · `codebase-design` (the sync engine's interface).

Recommendations settled in this spec (pick, why, runner up):
- **Cryptography library**: `@noble/curves`, `@noble/hashes` and `@noble/ciphers` in TypeScript on every platform. Why: audited, small, identical in every WebView, including older Android WebViews without X25519 in Web Crypto. Runner up: Web Crypto where available.
- **Keys**: one 32 byte root secret per space; every other key comes from it through HKDF with a label: `space-id`, `room`, `frames`, `backup`, `media`. Each device also has its own X25519 key pair for receiving a rotated secret. Why: one thing to protect, back up and rotate. Runner up: a signing key pair per space, which adds nothing at this stage.
- **Pairing**: the new device shows the code (as WhatsApp does), and the trusted device approves. CPace over ristretto255 for the PAKE, then a four word confirmation from the shared key. Why: approval belongs on a device you already trust, and a short typed code is only safe with a PAKE. Runner up: QR only, with a full 256 bit secret and no typed code.
- **Signalling, presence and pass-through**: one Durable Object per space room (`SpaceRoom`), WebSocket hibernation, nothing persisted (no storage API calls; only the socket attachments hold device ids). It replaces the D1 polling mailbox for your own devices; people sharing keeps the mailbox until Stage C. Why: one live connection gives presence, introductions and relaying with no polling cost. Runner up: Cloudflare Realtime TURN for the pass-through, kept for Stage B if relayed media proves costly.
- **Local network**: WebRTC host candidates, not mDNS discovery. Why: ICE already prefers the shortest path, and it works in browsers too, which cannot listen for local connections. Runner up: native mDNS plus a Rust socket in Stage B, which would also remove the brief Cloudflare introduction at home.
- **Sync protocol**: one connection per device pair, multiplexing documents. Each frame is `{docId, y-protocols message}`, encrypted. On connect, devices swap a digest list (doc id plus a hash of its state vector) and sync only the documents that differ; the library document goes first. Why: no need to open every document on every connect. Runner up: one connection per document, as sharing does today.
- **Media**: synced by its existing media id (ids never change once written), with size and SHA-256 sent first; asked from the home device first, then any device. Why: no migration of existing media ids. Runner up: renaming media to content hashes.
- **History**: per note Yjs snapshots, with `gc: false` for note documents only (the library document keeps gc on). Why: snapshots need deleted items kept; notes are small, the library changes constantly. Runner up: storing whole copies, which wastes space.
- **Backup format**: a folder `Notables Backup YYYY-MM-DD/` holding `manifest.json`, `docs/<id>.bin` (encrypted Yjs state), `media/<id>.bin` (encrypted) and `history/`. Why: plain files any folder or sync tool can hold; merging is Yjs. Runner up: one zip file.
- **Limits**: up to 10 devices per space; the pass-through drops frames over 256 KB and asks the sender to chunk.
- **Free plan**: media never goes through the pass-through (AC-21), and presence uses hibernating sockets so idle devices cost nothing.

## Design

**Where things live**:
- `packages/sync/src/space/`: root secret, key derivation, device list, rotation.
- `packages/sync/src/pairing/`: CPace exchange, four word confirmation, secret handover.
- `packages/sync/src/engine/`: the multiplexing sync engine, digest exchange, media transfer, the transport interface with `webrtc` and `relay` transports.
- `www/src/server/spaces/`: the `SpaceRoom` Durable Object and its WebSocket route (`/spaces/connect`).
- `www/src/features/devices/`: Settings > Linked Devices, Link a Device, Add a Device, Version History, export and import.
- `www/src-tauri/src/`: key store access for the root secret, and the save dialog for exports (both already exist in parts).

**The device list** lives in the library document as an encrypted map `devices`: id, name, platform, X25519 public key, `home` flag, `removed` flag, last seen. Removal sets `removed` and triggers rotation (AC-12).

**Rotation**: the device that removes another makes a new root secret, encrypts it for each remaining device's X25519 key, and sends it through the room when each one connects. Until a device has the new secret it keeps using the old one with the devices that also have only the old one.

**SpaceRoom messages** (all bodies encrypted except routing): `hello {deviceId}`, `presence {online: deviceId[]}`, `signal {to, body}` for WebRTC offers and answers, `relay {to, body}` for pass-through frames, `pair {code room}` for pairing. The object keeps no history and never calls its storage.

**Path indicator** (AC-2, AC-9): from the selected ICE candidate pair: `host` means same network, `srflx` or `prflx` means direct over the internet; a relay connection means through Cloudflare.

## Build plan

Build approach: Tracer Bullet (the project default for production work): one thin end to end thread across two real devices first, then thicken.

1. **Space identity**: create the root secret and space on launch (AC-1), keep it in the key store, and add Settings > Linked Devices showing this device. Tests: key derivation vectors, migration of an existing install.
2. **SpaceRoom**: the Durable Object, its route and binding (`wrangler.jsonc` migration), presence only. Deploy to production behind a flag.
3. **Tracer**: library document sync between two devices through the relay, encrypted, with a secret copied by hand in a debug build. Proves AC-6, AC-7 and AC-8 on the iPhone and the TECNO.
4. **Pairing**: QR and typed code, CPace, four words, handover (AC-3, AC-4). Remove the debug copy.
5. **Everything syncs**: all notes with the digest exchange, then media (AC-5, AC-10).
6. **Direct paths**: WebRTC with host candidates first and the path indicator (AC-9, AC-2).
7. **Home device and removal**: home flag, removal, rotation (AC-11, AC-12).
8. **History**: note snapshots and Version History (AC-13).
9. **Backups**: recovery key, export, import, restore (AC-14, AC-15), and the web warning (AC-17).
10. **Wallet**: encrypted card records sync, newest change wins per card, wallet password per device (AC-20).

Each step ends with checks run on real devices (the owner's iPhone, the TECNO, and the web), not emulators.

## Consequences

- Sync no longer needs PassID, and ADR-0005's reason to hold it back goes away, because the relay cannot read anything.
- Losing every device without the recovery key or an export loses the space, by design. The reminders in AC-14 matter.
- iPhones only sync while Notables is open; a desktop home device that stays running fixes that in Stage B.
- Linux desktop WebKitGTK often ships without WebRTC; there the relay is the only path until a Rust transport exists (open question 4), and on the free plan that means Linux syncs text but not media.
- The pass-through costs Durable Object time and bandwidth; media through the relay is the expensive part.
- Note documents keep their history and grow over time; Version History needs a way to prune old versions later.

## Owner answers (9 October 2026)

1. Wallet sync: **yes**, in Stage A, wallet password per device (AC-20).
2. Recovery key: **both**, shown at setup and kept in Settings (AC-14).
3. Settings sync: **yes**, except what belongs to one device (AC-16).
4. Linux desktop: **relay only for now** (accepted 10 October). The owner asked why. WebKitGTK, the engine Tauri uses on Linux, is usually built without WebRTC on Ubuntu and Debian, so the Linux app cannot connect directly and would use the Cloudflare pass-through only, which on the free plan means text syncs but media waits. The alternative is a Rust WebRTC stack (`webrtc-rs`) for Linux alone. Recommendation: relay only for now.
5. Cloudflare budget: **free plan only for now** (AC-21).
6. Exports: **encrypted by default** (AC-15).

## Follow-up

- ADR-0007 must be accepted before step 1 starts; then supersede the parts of ADR-0003 and ADR-0005 it changes.
- Add a scope row for this feature in `docs/scope/` when it is accepted.
- `AGENTS.md` gets the new areas (`space`, `pairing`, `engine`, `devices`) through `/sync` once built.

## Rationale

See [rationale.md](rationale.md).
