# Motion, materials and visible viewport

The owner requested quieter neutral grounds, consistent motion, compact folder
controls, calendar zoom and keyboard-aware scrolling. This checkpoint preserves
Workspace's existing width limits and the web Settings layout.

## Changes

Hino UI 0.1.7 was published from commit `6122a23` and deployed at
hino.pherus.org, deployment `36ce06a8-1027-41f8-9d9e-e08c7665b848`.
Notables and Pluraliti pin the public package. Hino owns the visual viewport
hook, viewport-sized sheets, native scrolling utility, quieter material rims
and neutral grounds. Global element transitions and hidden scrollbars were
removed; controls retain their deliberate transitions and keyboard focus cues.

The app shell follows the visible viewport, hides floating tabs while typing,
and provides real content padding below bottom navigation. Workspace, lists,
Wallet, Settings and Calendar share that scroll clearance. The drawer remains
mounted off screen and uses transform motion without animating a backdrop blur.
Sidebar selection animation is scoped per sidebar instance.

Navigation distinguishes entering a nested page, returning and changing places.
Supported engines use View Transitions; other engines retain a small Motion
fallback. Calendar zoom captures its own region and uses the tapped date as its
origin. Reduce Motion disables the transitions. The title provides one back
control on phones, through day, month, year and Years.

Years contains date-generated miniature calendars, incrementally adding complete
rows around the selected year. Detailed years show three months across on phones.
Folder actions use a translated compact icon popup, xs controls and an explanatory
hint. Pointer and keyboard dismissal preserve floating-layer ownership. Calendar
text inputs, notes, quick add and ordinary form actions now use Hino controls.

## Verification

- Frozen install, lint, all package typechecks, 430 TypeScript tests, web build,
  Worker smoke and native frontend build passed. Four existing lint warnings
  remain outside this change.
- Rust formatting, Clippy with warnings denied and 56 library tests passed;
  two existing tests remain ignored. No Rust implementation changed.
- Hino checks passed before publishing: package/docs builds, formatting/lint,
  typechecks, 101 tests and packing.
- Synthetic browser checks verified compact popup rendering, hints on keyboard
  focus, Escape, outside dismissal, focus restoration, initial sheet surface
  focus and forward/reverse Tab wrapping. A real dismissal failure was corrected.
- Calendar thumbnail coverage checks ordinary/leap-year dates and the single
  current-day marker. Navigation coverage checks folder direction, place changes
  and calendar zoom hierarchy.
- TECNO's separate debug app verified the popup stays inside its 360-pixel
  viewport. Opening the folder field reduced the visible height from 820 to
  517 pixels; shell and sheet followed it, and input/Cancel/Save stayed visible.
  The empty folder draft was cancelled. Day/month/year/Years navigation was
  checked with actual touches. The final build also confirmed 32-pixel folder
  action buttons with 44-pixel touch targets, four year thumbnails around 2026
  and the detailed three-column year grid. No test note, transaction or card was saved.

## Boundaries and next

Physical iPhone keyboard, scrolling and reduced-motion acceptance remain pending.
This is not a measured frame-rate claim. Calendar gestures and remaining custom
controls need further work; native Android/iOS widgets remain the next feature
stage. The owner requested releasing this checkpoint as v0.2.14. Store build
status is recorded separately from local acceptance. The existing Play app and
personal content were preserved during testing.
