# Wallet capture store and vault structure, 20 October 2026

## Change

The public wallet-store.ts API is unchanged. Capture operations now live in
create-wallet-capture.ts behind WalletCaptureContext. model/types.ts owns
WalletState; create-wallet-state.ts owns initial values. The central store keeps
state transitions, access lifecycle and card operations.

Import previously captured its cancellation identity after native status
reconciliation. Cancelling or clearing Wallet during that request could let a
late response revive import or report a stale error. The import now captures
identity before requesting status and checks it before applying state. A fresh
picker selection can still reconcile access after the old UI was cleared.

Rust vault.rs delegates persisted types, schema/limits, encrypted audit and tests
to vault/types.rs, schema.rs, audit.rs and tests.rs. The public vault type paths
remain stable. Schema bytes and the audit function were compared with the
previous source and are unchanged. Cryptographic context, serialized field
names, transaction boundaries, quotas and key policy remain unchanged. No ORM,
new storage format, migration or card-data operation was introduced here.

## Evidence

The three cancellation/status regressions fail against the preceding source in
the isolated validation checkout and pass after the fix. Further tests cover
abandoned decoded-image cleanup and successful fresh-selection recovery. The
existing Face ID and NFC lifecycle cases pass. All fixtures are synthetic.

The four existing vault tests pass after extraction: encrypted idempotent
mutations/stale revisions, authenticated header integrity, failed-write rollback,
and encrypted disk persistence/restart. Full native checks pass: Rust format,
Clippy with warnings denied, and 56 tests with two existing ignored tests.
Workspace frozen install, lint, typecheck, 409 TypeScript tests, web build,
Worker smoke and native Linux frontend build passed.

## Next

Continue Wallet service/lifecycle boundaries and native session/command contracts.
Physical iPhone OCR/NFC and picker return behavior still require device checks
on the next native build. No native release or web deployment in this stage.
