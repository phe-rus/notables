# 0005. Rationale: your devices, together

## Context

On 9 October 2026 the owner described how Notables should work across an
iPhone, an Android phone and the web: start anywhere, link devices by
scanning or typing a code, continue on whichever is on, never lose
anything, use the local network when possible, and let Cloudflare only
pass data through. End to end encryption by default; PassID waits. The
full vision and the platform limits discussed are in
[ADR-0007](../../../adr/0007-linked-devices-pass-through-network.md).

What exists today (read from the code on 9 October):

- Note bodies are Yjs documents (`NoteProvider`, `packages/sync/src/provider`),
  stored locally through `Persistence` backends. `NoteProvider` can connect
  to a server when `VITE_SYNC_HOST` is set, but no Durable Object exists.
- One library Yjs document (`getLibrary().doc`) holds the notes index,
  books, series, calendar events and invoices.
- Media files have random ids (`createId()` in `media-store.ts`), saved as
  files natively and in IndexedDB on the web; an id never changes content.
- Sharing with people uses a WebRTC mesh (`packages/sync/src/peer`) with
  y-protocols messages, an encrypted D1 mailbox for introductions polled by
  clients, and STUN servers only.
- Yjs garbage collection is on everywhere, so no version history exists.

The owner is resting with limited time and intermittent power, and asked
for the recommended choices to be made rather than asked; the genuinely
open choices are listed in the spec.

## Options considered

### Option 1: one encrypted engine over interchangeable transports (chosen)

A sync engine in `packages/sync` multiplexes every document of the space
over one connection per device pair, encrypting each frame with keys from
the root secret. Transports are WebRTC (host candidates first, which gives
the local network path for free) and a Durable Object that forwards frames
and stores nothing.

- Meets every owner requirement, including no account and no storage on
  Cloudflare.
- Reuses the y-protocols messages and WebRTC code already written for
  sharing.
- One Durable Object per space gives presence, introductions and
  relaying over a single hibernating WebSocket, cheaper than polling D1.

### Option 2: a Durable Object per document that stores encrypted updates

ADR-0003's original design, with encryption added.

- Simplest offline delivery: a phone that wakes later still gets changes.
- Rejected because the owner asked that Cloudflare store nothing. It
  stays possible later as an opt-in mailbox with a time limit.

### Option 3: native only transports (mDNS and Rust sockets), relay for the web

- Best local network behaviour and no Cloudflare introduction at home.
- Rejected for Stage A: browsers cannot listen for connections, so the web
  would need a second path anyway, and three platform specific socket
  layers cost far more than WebRTC. Kept as a Stage B improvement.

### Option 4: an existing sync product (a hosted CRDT service)

- Fast to start.
- Rejected: they store data on their servers, usually need accounts, and
  add a vendor to a privacy promise.

## Rationale

Option 1 is the only one that satisfies all of the owner's rules at once:
no account, end to end encryption, Cloudflare as a pass-through only,
local network first, and every platform including the web. It also builds
directly on code that works today (Yjs documents, the peer protocol, the
WebRTC mesh) instead of starting over.

The root secret design keeps one thing to protect, back up (the recovery
key) and rotate (device removal). CPace makes a short typed code safe; the
four word confirmation catches a stranger in the middle. Content addressed
media was rejected only because existing media ids already never change,
which gives the same safety with no migration.

The cost of never storing on Cloudflare is that devices only sync while
two of them are online together. On iPhone that means while the app is
open. The home device (a desktop that stays running, Stage B) is the
answer the owner already proposed.

## References

- ADR-0003, ADR-0005, ADR-0006, ADR-0007 in `docs/adr/`.
- Spec 0003 (digital card wallet) and spec 0004 (lock), for the wallet
  slice and the recovery key wording.
- Sources by name, not fetched: the Yjs documentation (snapshots, gc), the
  y-protocols sync messages, Cloudflare Durable Objects WebSocket
  hibernation, the CPace PAKE draft (IRTF CFRG), WhatsApp and Signal linked
  devices (pairing direction), the noble cryptography libraries.
