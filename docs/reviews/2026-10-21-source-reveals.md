# Source reveals and native navigation

## Release checkpoint

Commit `c655cfe`, tag `v0.2.15`, completed every selected job in
[run 39665751160](https://github.com/phe-rus/notables/actions/runs/39665751160).
Linux and Windows installers are in one published preview release with checksums.
Android arm64/x86_64 went to Play internal testing; iOS went to TestFlight.
macOS is excluded pending its setup. Desktop functional testing was not performed.
Web deployment: `aa3098c3-5736-4e93-befc-44acbbc4527f`.

## Following interface checkpoint

Hino UI 0.1.10 is published from `fbc8d5a`; its docs deployment is
`582c0dca-c1b1-4c72-b726-f02ba6dd50a6`. Anchored menus measure their trigger,
grow from its rectangle, and restore its appearance after closing. Point menus
retain a compact reveal. Material rims differ between light and dark. Hino's
full checks pass, including the two new geometry regressions; its npm audit is clear.

Notables pins that public release. Folder cards and lists share a named View
Transition surface, including returning to Workspace. Folder actions expand in
their row; the header exposes view mode and selection alongside More. Search
animates width without scaling its contents. Place changes leave the live tab
selection spring outside page snapshots. Native Settings consolidates Sidebar
and Haptics into Appearance, listening/reminders into Writing, and Widgets into
Tools & assistance with AI help. Web Settings keeps its existing organization.
Personal counts read existing local stores without browser discovery polling.
Sidebar folder disclosures preview up to eight notes.

## Physical TECNO evidence

The separate debug package was updated with data preserved. Device identity was
checked as TECNO CI6 at `192.168.1.2:5555`. Reduce Motion was off.

- An empty folder's action row kept its 320-pixel width and expanded from
  48 to 89 pixels high. No floating action dialog was created.
- Opening that folder matched `folder-surface` to the 360 by 820 note-list
  surface. Returning produced an active `folder-close` transition and matched
  back to a 320 by 49 row. The recorder observed 27 active transition frames;
  this is evidence that the transition ran, not a frame-rate benchmark.
- The More menu grew from the pressed 29.44-pixel button rectangle to a
  200 by 167.625 menu. The trigger's opacity was restored after dismissal.
  Geometry recording: `/tmp/notables-menu-reveal-frames.json`.
- A slow real touch scroll contracted Calendar search from 268 to 48 pixels.
  Across 174 sampled frames, its icon stayed 19 pixels wide and its capsule
  stayed 48 pixels high. Recording: `/tmp/notables-search-reveal-frames.json`.
- Compact search expanded, focused and remained above the keyboard: visual
  viewport 517, footer top 457 and bottom 505. The subsequent synchronous-focus
  refinement keeps activation in the tap handler; physical iPhone acceptance
  remains pending.
- Calendar's Workspace back control returned directly from the day view.
  Its sheet had six 48-pixel category rows; an empty category expanded in place
  and Done dismissed it. The back control is present at every zoom level in code.
- Native Settings shows eight destinations including the profile, instead of
  thirteen separate category rows. Appearance includes Sidebar and Haptics.
- The sidebar disclosure opened seven existing note links without navigating.
  Only counts and geometry were inspected; no private note bodies were copied.

No personal note, event, receipt or card was created, edited or deleted.

## Validation and follow-up build

Frozen installation, lint, all package types, 431 TypeScript tests, the web
build, native frontend build and Worker smoke pass. Rust formatting and Clippy
pass; 56 library tests pass with two existing ignored tests. The npm audit
reports no advisories. The follow-up store/desktop build uses v0.2.16; CI success
and Apple processing must be confirmed separately from local checks.

## Remaining

Physical iPhone motion/keyboard acceptance is still needed. The editing dock's
placement/expansion, workspace search density/ranking and spreadsheet usability
remain unfinished. Spreadsheet work needs actual editing improvements, including
range operations, paste, undo, formatting and keyboard/touch navigation, before
claiming parity with mature spreadsheet apps. Native widgets and the separate
app/content Lock follow. Wallet authentication remains separate and mandatory.

Design references: [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
and [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/).
Hino preserves its own material language and system accessibility settings.
