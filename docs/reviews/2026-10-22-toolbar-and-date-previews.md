# Toolbar and date previews, 22 October 2026

Hino 0.1.13 is public, from commit 8c2bc68, following 0.1.12 (2859039)
and 0.1.11 (c13c440). The public registry version was verified before updating
Notables and Pluraliti. The Hino website deployment is
fbeddb56-f90c-4859-923d-eb8054539a2c.

## Behavior

Folder and note editor header More menus pass their owning action group to
Hino. The button stretches across that group before unfolding vertically, and
reverses through the strip on close. Sibling controls are hidden and inert for
the presentation. Shared ownership survives follow-up menus; focus returns when
the last surface finishes closing, without taking it from a newly opened dialog.
Point menus and other callers retain their existing behavior. The rich editor
formatting popover remains separate; this change does not claim every popup
uses the new toolbar presentation.

Hino refits menus to visual viewport resize/pan events instead of closing on
window resize. Opening the editor More menu can dismiss the keyboard without
dismissing the menu itself. Tall menus regain their natural height as room returns. Outside scroll dismissal
requires user scroll intent; keyboard layout scrolling does not close the menu.
Refitting reads the mounted surface rather than the removed measurement node.

Formatting-toolbar pointer presses preserve the caret and keyboard on touch,
matching their existing mouse handling. Folder reveal actions have 28-pixel
visual controls with smaller icons and expanded touch targets.

Workspace Calendar previews upcoming dates, with event color indicators, in
pairs. The next pair reveals every six seconds. Recurrence, skipped dates,
completed reminders and trips already in progress use the shared calendar
model. The preview pauses on hover, focus and backgrounding; Reduce Motion
keeps the first pair static. Screen readers get the dates and event titles
without repeated live announcements.

Native Settings selectors are compact. Hino rows wrap wide controls below the
label before squeezing the label. Workspace and native Settings cards have
neutral grounds and quiet inset edges in either appearance. The web Settings
organization is unchanged.

## Validation and boundaries

Hino: installation, formatting/lint, CLI build, website build, typechecks,
109 tests and package export checks passed. Notables: frozen installation,
lint, all package typechecks/tests, web build, Worker smoke, native frontend,
Rust formatting, Clippy and library tests passed. npm audit returned an empty
advisory map. One earlier full run hit an existing Miniflare proxy assertion in
the signalling mailbox concurrency test; the isolated test and full rerun passed. GTK3's existing GLib advisory remains unresolved.

Physical checks use the separate TECNO debug app. Physical iPhone, tablet and
ChromeOS checks remain pending; Android evidence does not establish them.
Desktop installers remain build-only. No Hino browser check is claimed.

v0.2.17's editor fix was pushed first, then deployed as Worker version
695a4cf3-46d0-4d53-a907-367c7677ac36. The follow-up release is v0.2.18.
Google Play builds target internal testing. TestFlight upload success does not
establish Apple processing, export compliance or tester availability.

## Physical evidence

TECNO: folder header menus hide their action group (opacity 0, inert true)
and restore it on close (original opacity, inert false). The 200-pixel menu
stays within the 360-pixel window. Folder actions measure 28 by 28 pixels.

The formatting menu opens with the caret still active and a 517-pixel visual
viewport: menu top 188.5, bottom 447; toolbar top 453, bottom 505. The keyboard
stays open. Privacy rows fit within 328 pixels with no horizontal overflow;
Wallet's selector measures 32 pixels high.

A synthetic daily "Preview check" event demonstrated date-pair cycling
(Oct 30/31 to Nov 1/2) in an 85-pixel-wide, 28-pixel-high preview, without
horizontal clipping. The event was removed through Delete every time. Only
synthetic keyboard-check notes were moved to Recently Deleted.

v0.2.17 completed all four platform jobs successfully. Physical iPhone testing
and App Store Connect processing/compliance for the follow-up remain separate.

With Hino 0.1.13 on TECNO, opening editor More from a focused editor
changed the visual viewport from 517 to 820 pixels and retained the menu
(top 49.3, bottom 328.3, right 348 within a 360-pixel window). The
action group remained hidden/inert. The synthetic Menu_resize_check note
was then moved to Recently Deleted through its own Delete note action.
