# Contributing

## Setup

```sh
corepack enable
pnpm install
pnpm dev          # runs every app in development mode
```

Requirements: Node 22+, pnpm 10. Desktop builds also need Rust and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/). Mobile builds
need Xcode and/or Android Studio, or use EAS Build.

## Checks

```sh
pnpm lint         # Biome
pnpm typecheck
pnpm test
pnpm check        # all of the above
```

CI runs the same commands on every pull request.

## Branches

- `main` is always releasable.
- Work on short-lived branches: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Merge through pull requests.

## Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary in the imperative, lower case, no period>

<body: what and why, wrapped at 72 columns>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`.

**Scopes:** `web`, `mobile`, `desktop`, `core`, `sync`, `design-tokens`,
`api`, `sync-worker`, `docs`, `ci`.

Keep each commit focused on one logical change that builds and passes checks.

## Architecture changes

Significant decisions are recorded as ADRs in [`docs/adr`](docs/adr). Add a
new ADR — don't rewrite an accepted one.
