# 0003. Local-first private content, server-authoritative social data

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

Notes, diaries and recordings must work offline, sync between a user's
devices and support live collaboration with invited people. Public features
— likes, hearts, ratings, comments, view/read counts — need one consistent
source of truth and moderation.

## Decision

Split data into two worlds:

1. **Private content is local-first.** Each note body is a Yjs CRDT
   document persisted in on-device SQLite and synced through a Durable
   Object per note (`workers/sync`). Sharing grants other accounts access to
   that Durable Object.
2. **Social data is server-authoritative.** Publications and all social
   interactions live in D1 behind `workers/api`.
3. **Publishing is a snapshot.** Publishing copies a rendered snapshot of the
   note into the public world; unpublishing deletes it. The private document
   is never modified by either action.

## Consequences

- Offline editing and conflict-free merges come from Yjs, not custom code.
- Re-publishing after edits is an explicit action, so readers never see
  half-finished drafts.
- Two storage paths to maintain; the boundary is enforced by keeping social
  types out of the Yjs document schema.
