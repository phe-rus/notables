# 0005. Identity via Pherus, later

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Accounts will come from Pherus infrastructure, which is not ready yet. The
app must be useful before that.

## Decision

- No authentication for now. Each device has a local identity.
- Cloud sync is **disabled by default** until authentication exists, since
  an unauthenticated sync endpoint would expose private notes.
- Social actions are attributed to the local identity and rate-limited.
- When Pherus identity lands, local content is attached to the account.

## Consequences

- No account system to build or secure inside Notables.
- Data written before sign-in must be migrated to the account on first
  sign-in.
