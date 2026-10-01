# 0002. Repository layout: `www` and `shared`

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

With one app and one runtime stack, an `apps/` + `packages/` layout adds
indirection without benefit.

## Decision

- `www/` is the application: routes, features, server code, the Tauri Rust
  core (`www/src-tauri`) and Cloudflare configuration.
- `shared/` holds reusable packages with no app logic: `core`, `editor`,
  `ui`, `tokens`, `sync`. They never import from `www`.
- Packages are TypeScript source (no build step); Vite bundles them.

## Consequences

- Everything a feature needs is in one place under `www/src/features`.
- `shared/*` stays independently testable and could ship a second app later.
