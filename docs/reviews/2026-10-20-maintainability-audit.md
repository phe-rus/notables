# Maintainability audit, 20 October 2026

## Scope and evidence

Reviewed the storage boundaries, sharing lifecycle, release workflows, update
feature, shared toolbar wrapper and representative large screens. The inventory
covers 623 TypeScript and Rust source files under www and packages, excluding
dependencies, generated native projects and vendored code. Its counts include
the generated route tree and translation catalogues; those are not refactoring
targets merely because they are large. This is an inventory and focused review,
not a claim that every function has received a line by line review.

The workspace already contains separate UI and configuration edits. Preserve
those while staging the cleanup. Both v0.2.12 native CI jobs succeeded. Android
v0.2.11 is public Open testing; Apple external beta approval is still pending.
Successful compilation is not physical device acceptance.

## Findings

1. Sharing generates unnecessary server traffic. MailboxSignaling polls every
   700 ms during a 15 second busy window. PeerMesh sends announce every 12 seconds,
   and sending any message extends that window. One active shared note can thus
   sustain roughly 86 polls per minute before network latency, with two D1 reads
   per poll. This is a source derived estimate, not measured production billing.
   The runner starts a session for every shared note. Background polling and
   reconnect lifecycle need explicit ownership and coverage.
2. The inventory found 739 imports with two or more parent traversals. Add an
   app alias understood by TypeScript, Vite and Bun, then migrate references
   mechanically, including tests and scripts. Packages retain package exports.
3. There are 271 interface declarations and 170 type aliases in the inventory.
   Feature contracts and component props belong beside their feature in
   types.ts, using exported type aliases by default. Keep framework declaration
   merging and generated declarations where their framework requires them.
4. There are 121 raw button elements, 52 inputs and three textareas. Review them
   by purpose. Hino Button, IconButton, TextField, TextEditor, Picker and Toggle
   own interactive app controls. Hidden file inputs and specialised browser
   capture primitives remain valid. HTML layout tags are not a Hino violation.
5. Large mixed modules include finance-ledger.tsx (665 lines), setup-flow.tsx
   (660), books-list.tsx (658), calendar-screen.tsx (595), note-screen.tsx (565)
   and manual-card-form.tsx (506). Extract views, hooks, contracts and domain
   operations by responsibility. Counts are from the existing working copy.
6. The update feature introduced recently also mixes contracts, policy parsing,
   runtime state, fetching and UI. Refactor this first as a small complete slice.
   One public responsibility belongs in each module; related private helpers
   may stay with it rather than becoming a generic utils directory.
7. D1 SQL is handwritten in publications.service.ts and signals.service.ts.
   Drizzle can supply a shared typed schema and repositories without changing
   tables or moving private content. Preserve existing SQL migration history.
   Publication ratings read the previous value outside the write batch, so
   concurrent updates merit a regression test during that repository migration.
8. Rust storage already has database, documents, media, errors and commands
   modules, but wallet and model modules remain large. Separate production
   operations, contracts and tests while preserving cryptographic formats,
   transaction boundaries and migration order. Function count alone is not a
   defect in a cohesive Rust module or impl block.
9. Release tags currently permit separate android-v and ios-v versions, and
   desktop CI only builds debug executables when manually requested. Replace
   this with one release version and a desktop matrix feeding one draft release.

## Why D1 exists in a local app

Private documents use native SQLite, Yjs update logs and media files. A linked
browser reads through its approved device. Wallet is separately encrypted on the
device. D1 currently holds public publication metadata, reactions, ratings and
short lived encrypted sharing introductions. R2 holds explicitly published
snapshots/media and model packs. These are distinct from private note storage.

Device rooms use Durable Objects, not D1. They introduce devices and can relay
encrypted frames. A working local WebRTC channel carries document traffic
directly, but discovery still needs the room and cross network connections can
fall back to it. Offline native LAN discovery remains unfinished. Do not describe
all sync as independent of Cloudflare yet.

The mailbox polling loop, per note sessions, announcements, reconnects, public
pages, model downloads and link previews explain possible request sources.
Actual production totals require endpoint metrics. Introducing an ORM will not
by itself reduce those requests. Fix transport and lifecycle behaviour directly.

## Decisions for cleanup

- Use @/ for app imports crossing feature or shared boundaries. Short relative
  imports inside a module remain readable. Preserve framework route filenames.
- Put exported feature contracts and props in an owned types.ts. Avoid inline
  prop object signatures in components. Prefer export type Name = {...}.
- Use Hino controls and tokens. Put reusable missing controls upstream in Hino.
- Use descriptive responsibility names, explicit imports and narrow exports.
  Avoid global barrels that eagerly import unrelated features or create cycles.
- Introduce Drizzle for D1 in a separate stage, preserving existing tables and
  test coverage. Keep SQLite CRDT records as records, not a second relational
  representation of note content. Evaluate a Rust ORM against actual relational
  needs rather than replacing encryption and update log code by name alone.
- Keep each stage independently reviewable. Verify behaviour after extraction.

## Desktop distribution and APT recommendation

One vX.Y.Z tag identifies Android, iOS, Linux, Windows and macOS. Build Linux x64,
Windows x64 and macOS arm64/x64 on GitHub. Attach desktop installers to one draft
GitHub release with platform and architecture in asset names. Build only today;
desktop functional acceptance and signing/notarisation remain separate.

Start with .deb downloads. Then create a signed Pherus APT repository with
distribution-specific dependency verification, a scoped Signed-By key and
documented upgrades. Hosting .deb files alone is not an APT repository. Official
Debian inclusion requires packaging review and a maintainer/sponsor; it is a
later channel, not a switch in GitHub Actions.

References: [Tauri release pipelines](https://v2.tauri.app/distribute/pipelines/github/),
[GitHub runner architectures](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
[Drizzle D1 adapter](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1),
[Debian package maintenance](https://www.debian.org/doc/manuals/developers-reference/ch05.en).

## First implementation checkpoint

The first slice converts 777 deep imports across 289 files to the app alias,
separates the update feature's contracts, policy, store, hooks and Hino UI, and
replaces the shared toolbar primitive. Pairing now has owned contracts and
separate membership, device-store and subscription modules. The mailbox's fast
polling window excludes announcements and cannot overlap foreground polls.

Verified with Bun 1.3.11 in an isolated snapshot of the staged source: frozen
install, lint (four existing warnings), all four package type checks, 383
TypeScript tests, web build and native Linux prerender. Cargo format and Clippy
pass; native unit tests pass with 56 passed and two existing ignored tests.
Android's Kotlin compilation passes, including the new LAN permission bridge.
The release workflow passes actionlint. No desktop app was launched or tested.

v0.2.13 is the next shared release version. Desktop build results belong to the
[release workflow](https://github.com/phe-rus/notables/actions/workflows/release.yml).
The remaining maintenance stages are not complete, and physical verification
of the updated pairing flow is still required.
