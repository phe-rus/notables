# Folder and calendar controls

## Implemented

Folder pages have an icon-based creation menu, ghost More button and mobile
search capsule with a detached plus. Calendar has the same footer, a Calendars
category sheet, search results and gallery/list year overviews. Generated yearly
finance ledgers and their containing folders are protected from deletion; the
underlying transactions remain editable. Finances has four header actions.
Settings uses the shared app ground, with a compact Wallet relock picker.

Hino UI 0.1.9 is published and its docs deployed. It adds opt-in Android tab
minimization and ignores programmatic scrolling when deciding to shrink controls.
Notables and Pluraliti pin the public package.

## Physical evidence

Checked in the separate debug app on TECNO CI6 using real ADB touches:

- Main tabs, folder search, its detached plus and Calendar footer measure
  48 CSS pixels high. Folder search remains 48 pixels with the keyboard open:
  visual viewport 517 pixels, capsule top 457 and bottom 505.
- The folder plus opens all nine note kinds with icons. The popup fits inside
  the 360-pixel viewport. More has a 32-pixel visible button.
- The Calendars sheet opens with icons and counts for all six event kinds.
- Settings has a transparent page wrapper over the shared app ground. The
  screenshot is `/tmp/notables-settings-shared-ground-tecno.png`.
- Years navigation works. Initial row insertion exposed an anchoring problem;
  the correction measures actual grid height instead of the scroll area height.
  The rebuilt TECNO app keeps the selected 2026 preview fully below the header
  (top 248, bottom 466, header ends at 84). Real slow scrolling extends the
  visible range through 2034 and contracts search to a 48-pixel circle. Initial
  programmatic positioning leaves search expanded. Screenshot:
  `/tmp/notables-controls-years-tecno.png`.

No personal note, card, receipt or event was created, edited or deleted.

## Automated checks

Frozen install, lint, package typechecks, web build, native frontend build and
Worker smoke pass. All 431 TypeScript tests pass. The first final test run hit
a Miniflare serialization assertion in the signalling mailbox test; the full
rerun passed without a code change. Rust formatting, Clippy and the library
tests passed earlier in this checkpoint; no Rust implementation changed.

## Remaining

Physical iPhone acceptance, main-tab scroll collapse and Calendar filtering still
need verification. Native app/content Lock,
widgets, system shortcuts and share capture remain separate unfinished work.
Wallet authentication is unchanged. Currency and tax suggestions follow those
priorities. This checkpoint has not been committed or released.
