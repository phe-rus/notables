# 0006. Device-first, peer-to-peer sharing, optional cloud backup

- **Status:** Accepted, refines [0005](./0005-identity-via-pherus-later.md)
- **Date:** 2026-10-01

## Context

People must be able to install Notables and use it fully without creating
an account or going online. Sharing with friends and family should not
depend on our servers, and cloud sync should never be a requirement.

## Decision

1. **No account, ever required.** Every feature that does not inherently
   need the internet works on the device alone.
2. **Peer-to-peer sharing.** Sharing a note with specific people connects
   their devices directly (WebRTC on the web, the Rust core on Tauri),
   torrent-style: devices exchange Yjs updates with each other. A share
   link carries the note id and a key; whoever holds it can join.
3. **Cloud sync is an opt-in backup.** Signing in with Pherus PassID
   (when available) enables the Durable Object sync as a backup and as a
   fallback relay when peers are not online at the same time. It is never
   the default.
4. **Publishing stays server-side.** Public pages, reactions and counters
   need one source of truth (ADR-0003) and work without an account via a
   per-publication key.

## Consequences

- The sync engine treats transports as interchangeable providers: local
  storage always, plus peer-to-peer and/or cloud when enabled.
- Peer-to-peer sharing needs a signalling step; a stateless Worker can
  broker introductions without seeing content (end-to-end encrypted).
- Notes shared peer-to-peer only update while at least one other holder
  is online, unless someone in the group enables cloud backup.
