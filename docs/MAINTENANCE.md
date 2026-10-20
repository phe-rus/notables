# Maintainability stages

Start with the first unfinished stage. The reasoning and initial inventory are
in [the 20 October audit](reviews/2026-10-20-maintainability-audit.md).

## 1. Imports and conventions

- [x] Audit actual source and storage boundaries; record findings.
- [x] Configure @/ in TypeScript and Vite; verify Bun and native prerender.
- [x] Replace deep app imports and affected test references.
- [x] Record feature contracts, Hino controls and module naming conventions.

## 2. A complete feature and shared UI

- [x] Extract update contracts to model/types.ts and focused policy modules.
- [x] Separate its runtime store, hook, update action and presentation components.
- [x] Replace the custom toolbar button primitive with Hino IconButton.
- [x] Verify existing update deadlines, withdrawal and server rendering.

## 3. Requests and storage

- [x] Reproduce the device-list failure and stale cross-space removal block.
- [x] Save authenticated pairing membership independently from online status.
- [x] Scope removal guards to the current space and support explicit reapproval.
- [x] Add Android 17 LAN permission handling at the pairing action.
- [x] Verify fresh iPhone/TECNO approval and three-device note changes on 0.2.13.
- [ ] Verify fresh ChromeOS approval in both directions, independent of its saved membership.

- [x] Fix announcements keeping the fast mailbox poll window alive.
- [x] Make one component own each sharing subscription and its cleanup.
- [ ] Verify request counts in idle, connecting, connected and background states.
- [x] Add typed Drizzle D1 schemas and publication/signalling repositories.
- [x] Cover concurrent rating updates and preserve existing migrations.
- [ ] Replace mailbox polling with the existing room transport in a separately
      verified change, including reconnection and key compatibility.
- [ ] Complete offline native LAN discovery from the existing sync plan.

## 4. Feature cleanup, one domain at a time

- [ ] Wallet forms, scanner lifecycle and native contracts.
- [ ] Finances import/review UI, ledger operations and receipt handling.
- [ ] Books list, shelves, imports and reader controls.
- [ ] Notes editor and capture toolbar, using Hino and owned props types.
- [ ] Calendar views, event form and gesture ownership.
- [x] Separate setup pages, adopt Hino fields/choices and refine spacing and motion.
- [ ] Remaining settings controls and translation gaps.
- [ ] Rust wallet/model modules, command payloads and separate test modules.

## 5. One release, all platforms

- [x] Use release tags only, with one version shared across platforms.
- [x] Add GitHub Linux x64, Windows x64 and macOS arm64/x64 package jobs.
- [x] Aggregate desktop assets into one draft GitHub release.
- [x] Trigger desktop packaging on GitHub, without desktop functional tests today.
- [ ] Repair Intel Mac packaging: ONNX Runtime 1.28 has no prebuilt Intel Mac library.
- [ ] Record signing/notarisation and APT prerequisites before public distribution.
- [ ] After desktop acceptance, publish a signed Pherus APT repository.

Each completed code stage must pass the repository's required checks before
push. Keep unrelated working edits separate. Store review and physical mobile
verification remain tracked in AGENTS.md and the existing release reviews.

Physical evidence: [0.2.13 pairing and sync](reviews/2026-10-20-pairing-membership.md).
Release run 39399850328 built Android, iOS, Linux, Windows and Apple Silicon Mac.
Intel Mac failed before packaging, so the installer collection job was skipped.
