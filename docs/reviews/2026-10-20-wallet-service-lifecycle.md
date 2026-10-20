# Wallet service and lifecycle boundaries, 20 October 2026

## Change

wallet-service.ts now describes commands. call-wallet-command.ts owns native
availability, response validation and failure normalization. wallet-failure.ts
owns the typed exception, wallet-error-codes.ts the accepted codes, and
resumed-wallet-status.ts foreground reconciliation. Consumers import each owner
directly. Unknown native errors remain unavailable without exposing raw details.

mount-wallet-lifecycle.ts owns native lock subscriptions, DOM listeners, activity
and status polling through WalletLifecycleContext. The store still owns state,
mutation sequencing, access timers and card actions. Lifecycle extraction retains
the existing Face ID/system-prompt guards, generation checks and disposal logic.

Rust session/types.rs owns IPC shapes, private cursor and session state.
Public session type paths remain stable. session/publication.rs owns the existing
atomic publication helper, compared unchanged with the preceding source. Android
still uses renameat2 NOREPLACE; other targets retain their previous publication
path. No wire fields, Serde naming, authentication policy or encrypted format
changes. Tests now import CardDraft from its owner explicitly.

## Evidence

All 79 Wallet tests pass. New boundary tests verify command arguments and valid
responses, rejection of full card values in a preview list, known/typed failures,
and normalization of unknown native errors. The lifecycle test releases a native
lock subscription that completes after disposal. Existing NFC, Face ID, scanner
and image-import regressions remain green. These are controlled synthetic tests,
not physical native authentication evidence.

Workspace frozen install, lint, typechecks and 414 TypeScript tests passed.
Web build, Worker smoke, native Linux frontend build, Rust format and Clippy
with warnings denied also passed. Rust tests passed: 56 passed, two existing
ignored tests. Native/mobile source implementations were
preserved; these Linux checks do not establish physical iPhone behavior.

## Next

Continue native access-policy/card-operation separation, then the next unfinished
feature in docs/MAINTENANCE.md. Physical iPhone OCR/NFC and picker return behavior
remain required before the next native release. No store release or web deployment
was initiated for this structural stage.
