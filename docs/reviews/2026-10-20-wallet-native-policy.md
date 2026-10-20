# Native Wallet session ownership, 20 October 2026

## Change

session.rs now owns construction and the shared Wallet state. Child modules own:

- access.rs: grants, expiry, foreground checks, locking, status and activity.
- credentials.rs: initialization, device/password unlock and prototype migration.
- cards.rs: reading, saving, deleting and paginated previews.

The same Wallet mutex, atomic epoch, key store and vault instance are used in
all modules. The split introduces no independent locks or duplicated state.
Cross-module private helpers are visible only within session. Public command
methods, platform/debug gates, timeout values and password-wrapper context stay
unchanged. Tests explicitly import constants, fixtures and persistence contracts
from their owning modules instead of relying on incidental parent imports.

All 29 moved method bodies were compared with the preceding source after
formatting and the nested iOS lifecycle path adjustment. They match. No card
validation, grant, cursor, audit, revision, encrypted format or quota behavior
was intentionally changed. session.rs is now 91 lines; access, credentials and
card operations are each below 260 lines.

## Verification

Targeted Clippy checks pass for all Linux targets with warnings denied. Existing
behavior tests cover mandatory authentication expiry, the separate sensitive
field grant, masking/public edits, timeout persistence, background/foreground
recovery, failed initialization, atomic publication, prototype migration,
revision conflicts and cursor invalidation. No structure-only tests were added.

Rust library tests passed: 56 passed, two existing ignored tests. Workspace
frozen install, lint, typechecks and 414 TypeScript tests passed. Web build and
Worker smoke, native Linux frontend, Rust format and Clippy checks passed.

## Next

Complete physical native acceptance before release. Linux checks do not compile
the iOS/Android lifecycle branches; those platform helpers and gates were
preserved, and mobile CI/device checks remain required. OCR accuracy, NFC and
picker-return acceptance remain separate from source organization.

Finances is the next independent cleanup. finance-ledger.tsx is 658 lines and
mixes receipt OCR, media writes, transaction review, previews and rendering.
Start with owned types and receipt components, then import/review ownership;
preserve deduplication, ledger values and automatic yearly FINANCES sheets.
No native release or deployment was initiated for this structural checkpoint.
