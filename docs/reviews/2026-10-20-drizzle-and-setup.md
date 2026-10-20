# Drizzle repositories and setup refinement, 20 October 2026

## Database boundary

Drizzle 0.45.4 now owns typed D1 queries through a request-created connection.
Publication tables and temporary signalling tables have feature-owned schemas
and repositories. Public contracts live in types.ts; the publication service
keeps authorization, validation and R2 content handling. Frontend readers import
types without importing the database service. The small error class is also
separate from storage.

Existing Wrangler migrations and stored column names are unchanged. No migration
or production database operation was performed. Private documents, SQLite, Yjs
and Wallet storage are outside this change.

The new concurrency regression reproduced one viewer being counted as twelve
ratings. Ratings and their totals now update in one atomic D1 batch. Reactions
also update their membership and counters together. Mailbox delivery and its
cursor are read in a single batch, so an arrival between separate reads cannot
advance the cursor past an undelivered message. Tests cover concurrent first and
replacement ratings, duplicate reactions and pagination across 105 messages.

This does not replace polling or establish measured production request savings.
The remaining transport and request-count work is tracked in MAINTENANCE.md.

## Setup

The former 660-line setup component is separated into its navigation shell,
individual pages, permission presentation helpers and owned props types. The
existing steps and license gate remain. Name entry uses Hino TextField; agreement
uses Hino Toggle; fonts use Picker with a live preview; language and initial
library choices use Hino Button. Headings, cards, permission actions and footer
controls are smaller and more consistent. Page motion respects Reduce Motion.

The real introduction and licence layout were inspected at localhost:3000.
Isolated step previews at 390 x 844 covered appearance, name, permissions and the
final library choice without accepting the licence or resetting a device. The
font selection persisted and the example/fresh choice switched correctly.
Screenshots are retained outside the source tree under the chat's setup-review
visualizations. Temporary preview source and configuration were removed.

No phone permission prompts, fresh native onboarding or AI setup were exercised
in this visual pass. Existing untranslated legal and platform-path text remains
in the translation backlog.

## Verification

An isolated checkout of the staged changes preserves unrelated working edits.
Frozen installation, lint, all package typechecks and 386 TypeScript tests passed,
as did the web build, Worker startup smoke test and Linux native frontend
prerender. Cargo formatting and Clippy with warnings denied passed. Rust library
tests passed: 56 passed, 2 existing ignored. The test command reused the existing
checkout's native build cache; its Rust sources and lockfile are unchanged.

Physical 0.2.13 connection evidence is in the separate pairing membership review.
These Drizzle and setup changes are subsequent source changes, not part of the
already installed 0.2.13 build.
