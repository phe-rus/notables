# Finances ownership, 20 October 2026

## Change

The 658-line finance-ledger.tsx now contains 143 lines of view composition.
use-finance-ledger.ts owns draft state, receipt OCR, message review queues,
ledger actions, export and saving. Separate components own transaction editing,
the ledger sheet, receipt preview, saved/pending receipt tiles and fee input.
PendingReceipt retains ownership of its object URL and revokes it on cleanup.

Domain and view contracts use exported types in model/types.ts. Draft defaults
are created at the action, so the date and issuer currency are not frozen at
module load. Consumers import the owning contracts directly. Feature imports
use the existing @ alias. There are no new dependencies or translated strings.

The ledger uses Hino Table parts and action buttons. Transaction fields use
Hino TextField and TextEditor with compact input sizing; existing app wrappers
retain localized Hino currency/type/date pickers. Field labels align across
columns, and form actions use small buttons. Receipt images remain native images
inside Hino controls.

## Preserved behavior

- Message identity is checked before attachment writes; FinanceStore also
  rejects duplicate message transactions.
- Amounts and fees remain integer minor units. Invoices and quotes do not become
  confirmed payments. Fee removal edits the parent transaction's fee only.
- Receipt removal edits the draft, and is persisted only by Save.
- Message review advances one suggestion per Save or Skip. Duplicate suggestions
  are excluded on extraction.
- FINANCES folder and yearly ledger projections keep their existing shared IDs.
- Camera processing retains its ten-image limit and reader/canvas cleanup.

No OCR accuracy, transaction parsing or storage schema change is included.
The existing scan/save implementations were compared against the preceding
source; differences are the draft factory name and formatting.

## Verification

The ten existing finance tests pass, covering payment/balance extraction,
duplicate rejection, exact amounts, CSV formula protection, picked receipt
copying, yearly projection and cross-device folder convergence. No tests were
added to assert file layout. An isolated browser preview used synthetic values
only: associated field names, compact aligned fields, the ledger table, separate
fee/principal rows and small destructive actions were checked. Its temporary
entry points were removed. No preview save wrote to a real library.

Frozen install, repository lint (four existing warnings), all package typechecks
and 414 TypeScript tests passed. Web build, Worker smoke, native Linux frontend
prerender, Rust formatting and Clippy passed. Rust tests: 56 passed, two existing
ignored tests. Vite does not optimize the Hino table TSX entry directly; its
shared dependencies are already covered by the existing Hino prebundle. No Vite
configuration change is included.

## Next

TECNO at 192.168.1.2:5555 is reachable, running Play build 0.2.13 (10026).
It is a non-debuggable release. The source cleanup is newer than that build;
its installed UI is not evidence for this checkpoint. No app data was cleared,
no personal receipt/card was touched, and no native release was started.

Before the next release, check receipt camera/image import, preview/removal,
message review, yearly sheets and CSV export on the updated native app. Review
stale asynchronous OCR completion and complete validation before media writes
as a separate behavior change with regressions. Wallet native acceptance and
the remaining domain cleanup stay in docs/MAINTENANCE.md.
