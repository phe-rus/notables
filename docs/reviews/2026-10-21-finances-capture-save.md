# Finances capture and save safeguards, 21 October 2026

## Findings and fixes

The form checked amount and description before writing receipts, while the store
also checked date, currency, fee and message identity. A synthetic invalid fee
reproduced a receipt write followed by rejection. FinanceStore.validate now owns
the same existing validation and duplicate rules. saveFinanceDraft calls it
before any receipt write; FinanceStore.save repeats validation at commit time.
Invalid details use the existing translated validation message. No schema,
transaction identity, monetary precision or duplicate matching rule changed.

Receipt acquisition had no cancellation identity. A late read, decoding error or
picker copy could replace a newer draft or clear its busy state. The capture
controller now owns the full acquisition, including copying temporary picker
files. Each wait checks its operation identity. Cancellation stops the owned
reader once and clears decoded canvases. Late image decoding still clears its
canvas; late picker copies still release the input grant. Outdated results,
errors and completion callbacks cannot modify the current review.

The hook cancels capture on unmount, explicit scanner dismissal, a new draft or
editing an existing transaction. Completion still retains selected receipt files
for review. Copy failures remain separate from OCR failures, so a failed picker
does not replace an existing draft with an empty receipt. Native OCR adapters and
recognition rules are unchanged.

## Verification

The save regression failed before the fix, with one write instead of zero.
It passes with shared validation. Tests also cover valid minor units, unchanged
existing attachment references, duplicate rejection before writes and allowed
edits to an imported transaction. Twelve new tests bring Finances to 22 cases.

Capture cases cover late success and failure, cancellation during engine load,
image decoding, recognition and picker copying, current failures, empty selection,
reader cleanup, page ordering and the existing ten image limit. Removing the
identity guards in a temporary test copy caused six cases to fail. All cases
pass with the guards restored. The temporary copy did not replace app source.

Frozen install, lint, all package typechecks and 426 TypeScript tests passed.
Web build, Worker smoke, native Linux frontend prerender, Rust formatting and
Clippy passed. Rust tests: 56 passed, two existing ignored tests.

## Device verification

TECNO is reachable at 192.168.1.2:5555. Play build 0.2.13 is preserved. The existing
separate debug package can be updated without replacing it. The current clean staged frontend and native Rust source built successfully for
Android arm64 and updated only that debug package. Existing app data was retained.

The synthetic PNG imported through the actual Android picker and OCR reader.
Review detected NOTABLES QA 21 OCT, USD 12.50 and QA211026 correctly. Preview loaded
the original 1300 by 1600 image. Entering a negative fee and tapping Save showed
"Enter a description and a valid positive amount." The review remained open and
the native media file list was identical before and after. Removing the pending
receipt removed its preview button. Cancel then closed the review. No test
transaction was saved. The synthetic image and temporary UI dump were removed
from TECNO, and the native media file list remained unchanged.

This verifies image import and review with the current source on a real Android
WebView. It does not establish live camera capture, CSV export or iPhone behavior.

## Boundaries

Validation before I/O does not make media and Yjs writes one transaction. A
storage failure or a duplicate arriving during a media write can still leave an
unused new file for the existing sweep; this change does not delete media on an
ambiguous commit failure. No personal record or receipt is a test target.
iPhone OCR/NFC accuracy and remaining release acceptance are separate checks.
