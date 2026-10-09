# 0007. Linked devices, a pass-through network, and people by public ID

- **Status:** Proposed (under discussion with the owner; nothing built yet)
- **Date:** 2026-10-09
- **Would update:** [0003](./0003-local-first-private-server-authoritative-social.md), [0005](./0005-identity-via-pherus-later.md), [0006](./0006-device-first-peer-sharing-optional-backup.md)

## Context

People use Notables on several devices at once, for example an iPhone, an
Android phone and the web. Work started on one must continue on any other,
and switching one off must lose nothing. Today only the parts below exist:

| Part | State on 9 October 2026 |
|---|---|
| Storage on the device | Built. Each note body is a Yjs document; one library document holds the notes index, books, series, calendar and invoices; photos and audio are files; the wallet is encrypted in Rust; settings stay per device. |
| Sync between your own devices | Not built. `NoteProvider` can connect to a server (`VITE_SYNC_HOST`), but no Durable Object exists, the library document and media have no sync path, and PassID does not exist. |
| Sharing with specific people | Built for one note at a time over WebRTC, with an encrypted mailbox in D1 for introductions. Both people must be online; STUN only, no TURN, so strict networks fail. |
| Publishing | Built. Note snapshots in R2, details and reactions in D1, a per-publication key instead of an account. |

ADR-0003 put a Durable Object per note as the sync store, and ADR-0005
held sync back until sign-in, because an unauthenticated store would expose
notes. The owner wants sync without an account, encrypted end to end, with
Cloudflare passing data through rather than keeping it.

## Decision

1. **A private space, created on the first device.** Its ID is the
   fingerprint of a key pair; only the person's own devices hold the
   private key. Everything in the space is encrypted end to end with keys
   derived from it. A name goes with it; nothing else is asked.
2. **Linking, not accounts.** A new device joins by scanning a QR code or
   typing a short code shown on a linked device, which hands over the key
   through an encrypted exchange. Settings lists linked devices, the
   network each is using, and lets you remove one.
3. **Every device keeps a full copy.** Yjs merges edits from any device in
   any order, so no device is the source of truth. The **primary** (home)
   device is the preferred place to keep everything and to fetch large
   files from, typically a desktop that stays running.
4. **A transport ladder, cheapest first:** the same local network directly;
   then a direct internet connection (WebRTC); then a pass-through relay on
   Cloudflare (TURN or a Durable Object socket) that forwards encrypted
   bytes and keeps nothing.
5. **An outbox instead of server storage.** Actions that need another device
   or person (sync these edits, share this note) wait on the device and run
   when a presence check shows the other side online.
6. **Git-like history and portable backups.** Each device keeps its change
   history (what changed, when, on which device) and can restore versions.
   Export writes the whole space to any folder, no login needed; import
   merges it back.
7. **People by a separate public ID.** A second key pair, shared like a
   phone number and never linked to the private space. Adding someone sends
   a request they accept or reject. Shared notes carry roles (owner, editor,
   viewer); devices refuse edits from anyone who is not an editor, and
   removing someone changes the note's key.
8. **Public is opt in.** A publication is a snapshot signed with the
   author's public key. Devices that hold it help serve it; a Durable Object
   keeps a copy only when no device online has it. Withdrawing sends a
   signed notice that honest apps follow.
9. **Model packs from peers.** Voice and Whisper packs come from other
   devices first (checked against the manifest's checksums), Cloudflare R2
   second. Phones share only on Wi-Fi while charging.
10. **Wallet and Artifacts are never public.** They sync only between a
    person's own linked devices. PassID, when it exists, is an optional
    backup and recovery, never a requirement.

## Consequences

- No account is needed to sync, and the server cannot read anything it
  carries; ADR-0005's reason to hold sync back no longer applies.
- **Platform limits shape the experience.** iOS suspends apps moments after
  they close, so a phone cannot seed or relay in the background; a desktop
  home device keeps sync alive. Waking a sleeping phone (friend requests,
  shared notes) needs APNs and FCM push through a small Worker that sends
  no content. Safari deletes a site's storage after 7 days without a visit
  and browsers cannot discover local devices alone, so the web is a window
  onto the space, never its primary.
- Cloudflare keeps a small role: introductions, presence, push, and
  pass-through relaying, all with encrypted payloads.
- **Contribution scores** (torrent-like seeding stats) are shown first; they
  gain ranking power only once identity resists fake devices (PassID).
  Names of people helping to serve a publication are shown to friends only,
  since they reveal what someone read.
- Public content held on people's devices needs reporting and a shared
  blocklist before the public network opens.
- Losing every linked device without an export or a PassID backup loses
  the space; the app must make export easy and remind people of it.

## Stages

| Stage | Delivers |
|---|---|
| A. Your devices | Private space, linking by QR or code, linked devices list, full sync of everything over the transport ladder, local history, export and import |
| B. Always reachable | Outbox, presence, the home device on the desktop, push to wake phones, local network first |
| C. Your people | Public ID, friend requests, shared notes with roles, writing together |
| D. Public | Signed snapshots served by devices with a Durable Object fallback, model packs from peers, withdrawing, moderation |
| E. Contribution | Visible stats; ranking power after PassID |

Next step: `/architect` a spec for Stage A.
