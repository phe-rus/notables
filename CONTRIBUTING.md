# Contributing

## Setup

Building and running the web and native apps is covered in
[DEVELOPERS.md](DEVELOPERS.md).

## Checks

```sh
bun run lint        # Biome
bun run typecheck
bun run test
bun run check       # all of the above
```

Run them before you push. CI runs the same checks, but only when started by
hand (Actions minutes are limited); a maintainer runs it on your pull request.

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

**Scopes:** `www`, `tauri`, `server`, `core`, `editor`, `ui`, `tokens`,
`sync`, `docs`, `ci`.

Keep each commit focused on one logical change that builds and passes checks.

## Architecture changes

Significant decisions are recorded as ADRs in [`docs/adr`](docs/adr). Add a
new ADR, don't rewrite an accepted one.
