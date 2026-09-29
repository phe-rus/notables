# 0005. Identity via Pherus accounts

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

Users will eventually sign in with a Pherus account at `account.pherus.org`,
which is not yet available. The app must be useful before that.

## Decision

- Treat `account.pherus.org` as a standard **OpenID Connect** provider using
  Authorization Code + PKCE on every client.
- Until sign-in, the app runs with a **local-only identity**. On first
  sign-in, locally created content is attached to the account and syncing
  begins.
- Workers verify access tokens against the provider's JWKS; no passwords are
  stored by Notables.

## Consequences

- No account system to build or secure inside Notables.
- The identity provider is configured by issuer URL, so development can use
  any OIDC provider until Pherus accounts go live.
