# 0003. Local-first private content, server-authoritative social data

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Notes, diaries and recordings must work offline and sync between devices.
Public features, likes, hearts, ratings, comments, view and read counts, need one consistent source of truth and moderation.

## Decision

1. **Private content is local-first.** Each note body is a Yjs CRDT stored
   on the device and synced through a Durable Object per note.
2. **Social data is server-authoritative**, in D1, behind server functions.
3. **Publishing is a snapshot** of the note's serialized content, stored in
   R2 and rendered on the server for readers; unpublishing deletes it. The
   private document is never modified by either action.

## Consequences

- Offline editing and conflict-free merges come from Yjs, not custom code.
- Readers never see half-finished drafts; re-publishing is explicit.
- Two storage paths to maintain; social types stay out of the Yjs schema.
