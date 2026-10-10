# Ultrapeach Sheet focus, first hardening slice

Date: 2026-10-10. Source repository: Notables. Status: implemented locally, awaiting user stage review. No commit, push or deployment for this slice.

## Change

Sheet now mounts a separate OpenSheet while visible. Its colocated useSheetFocus hook captures the opening control before children can autofocus, initially focuses the first available control when necessary, wraps Tab and Shift+Tab, redirects escaped focus, respects handled Escape, and restores a still connected opener after the exit completes. A stack prevents a parent Sheet from handling a child Sheet's keyboard events. Hidden and disabled controls are excluded. An empty surface can receive focus itself.

The backdrop is decorative instead of exposing an untranslated English button label. Existing app supplied visible close controls and Escape remain. Styles use readable cn groups; visual values and tokens did not change. No dependency or generated file changed.

## Browser verification

Started the existing Notables Bun dev command on port 3004, leaving Pass ID and Pass alone. Initial browser requests preceded readiness; the ready app then loaded. Direct calendar navigation works without accepting an onboarding agreement.

At 390 by 844:
1. Calendar New plan opened the real EventSheet. Initial focus was Kind.
2. Shift+Tab from Kind focused Add, still inside the dialog.
3. Tab from Add focused Kind, still inside the dialog.
4. Kind opened its real portaled Picker and focused the listbox.
5. Escape closed the Picker, retained the Sheet and returned focus to Kind.
6. A second Escape dismissed the Sheet after its exit animation.
7. Opening from the persistent Plan button, then dismissing, returned focus to Plan.
8. Viewport width and document width were both 390.
9. No event was saved. Screenshot: /tmp/ultrapeach-sheet-keyboard-verified.jpg. Viewport override was reset.

These are real browser checks, not new automated component tests. Existing Bun suites are unchanged. Multiple nested Sheets, empty Sheets, physical mobile keyboards and screen reader behavior still need dedicated coverage before claiming the full overlay system is hardened.

## Validation

Full Notables typecheck: all six packages pass.
Full existing Notables test command: all five test tasks pass (cached unchanged packages included); notes reports 164 tests and 407 assertions.
Root lint passes with one warning in unchanged www/src/features/sharing/lib/share-actions.ts.
Production web build passes with an existing publications dynamic import warning.
Native frontend build (TAURI_ENV_PLATFORM=linux) passes, including prerendering /. Existing Vite config loader and publications import warnings remain.
No Rust source changed or native binary build claimed.

## Remaining boundaries

This slice fixes Sheet keyboard focus, not all overlay behavior. Background screen reader isolation, scroll locking, ownership of floating layers, DialogHost, menus and tooltips remain open. Floating controls still use the existing global data-floating-layer marker. Do not describe this as a complete accessible modal replacement.

When a menu item opens a Sheet and that menu item disappears, there is no connected opener to restore. The persistent Plan button case passes. Menu trigger restoration needs a separate menu ownership change, rather than guessing a destination in Sheet.

## Next

Review this slice with the user. Continue with explicit overlay ownership and menu trigger restoration, then remaining copy and styling cleanup. Resolve shared package distribution before introducing Ultrapeach into Pherus. Preserve the existing tokens/ui structure and avoid copying dependencies from the Notables catalog into Pherus.

## Second slice: floating ownership and menu focus

Implemented locally on 2026-10-10. This supersedes the global-marker and disappearing-menu-opener limitations above. No commit, push or deployment.

An internal floating-layer registry relates each portaled Picker or menu to its opening element. Sheet focus and outside dismissal follow that ownership chain instead of allowing every marked popup. Menu actions restore their persistent trigger before invoking the action, so a newly opened Sheet captures that trigger. Menus focus actual enabled items with arrow keys, Home and End; native buttons handle Enter and Space. Escape dismisses the menu and restores its trigger. Tab dismisses and continues normal keyboard navigation. Exiting menus release ownership and event listeners.

Real browser checks in the calendar verified ArrowDown to Type It and then New plan, Enter opening EventSheet, Kind receiving initial focus, Escape closing the nested Picker while preserving the Sheet, and a second Escape closing the Sheet and returning focus to New plan, birthday or reminder. Separate checks verified Home, End, ArrowUp wrapping to New trip, menu Escape returning to the trigger, and Tab leaving the menu for the next calendar control. No event was saved. Screenshot: /tmp/ultrapeach-menu-focus-verified.jpg. Temporary viewport override was reset.

Scoped Biome check passes for all 36 UI source files. Full typecheck passes all six tasks. Existing tests pass all five tasks, served from unchanged test caches; notes reports 164 tests and 407 assertions. Root lint passes with the same existing sharing warning. Production web build passes with the existing publications import warning. These browser interactions are not automated component tests.

Native frontend build with TAURI_ENV_PLATFORM=linux also passes, including prerendering /. Existing publications import and Vite config-loader warnings remain. No Rust or native binary build is claimed.

Remaining: background screen reader isolation, scroll locking, DialogHost and tooltip contracts, nested Sheet coverage, physical mobile keyboard and screen reader checks, and a focus fallback when an opener is removed or cannot receive focus. Next work is the remaining foundation cleanup and an explicit shared-package distribution decision before Pass integration. Preserve existing token generation and package versions.

## Third slice: modal background

Implemented locally on 2026-10-10. The colocated modal-environment module isolates background DOM branches with native inert while preserving the Sheet wrapper, backdrop and owned portaled controls. It observes inserted or removed content, keeps the foremost Sheet active, records pre-existing inert states, locks body overflow and prevents wheel/touch scrolling outside the Sheet and its popups. Cleanup restores prior body styling and background states before returning focus. No dependency, generated token or visual design changed.

Real browser verification: background navigation became inert while the Sheet remained active; Kind's portaled Picker remained non-inert and focused; Escape dismissed the Picker first; Shift+Tab and Tab wrapped between Kind and Add; dismissing the Sheet restored the original New button and body overflow. The hidden library retained its pre-existing inert attribute intentionally. No event was saved. Screenshot: /tmp/ultrapeach-modal-isolation.jpg. Viewport override reset.

These checks establish DOM isolation and keyboard behavior, not a completed screen reader or physical touch-device audit. Scroll cancellation is implemented, but physical iOS/Android scroll chaining remains to verify. Other remaining work: nested Sheet lifecycle coverage, DialogHost, tooltip contracts, removed/non-focusable opener fallback, and package distribution before Pass adoption. This stage remains local for user review.

Validation: scoped Biome passes (37 UI source files), full typecheck passes (six tasks), existing test tasks pass (five cached tasks), root lint passes with the same sharing warning, and both production web and native frontend builds pass. Existing publications import and native config-loader warnings remain. Diff whitespace check passes. No Rust or native binary compilation is claimed.

## Owner checkpoint

The owner approved committing these changes without a release and requested returning to Pherus promptly. Earlier local/uncommitted status descriptions are historical. No tag, push, release workflow or deployment is part of this checkpoint. Native date dialogs are disliked: www/src/features/calendar/components/event-form.tsx has three date inputs and invoice-screen.tsx has two. Ultrapeach currently has no DatePicker. This remains a separate focused component task rather than extending the Notables work before Pherus adoption.
