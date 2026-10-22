# Books reader checkpoint, 22 October 2026

The Apple Books research is in [the source review](2026-10-22-books-research.md).
Its documented behavior informs the interaction structure. No exact Apple motion
duration, easing or cover transition implementation is claimed.

## Received content

The former reader loaded only the serialized note-content cache. Sync persists
Yjs documents, while that cache was populated by the editor or an import. A
received chapter could therefore have its title and synced document without
renderable cached text. The effect also did not follow subsequent body arrivals.

A focused hook harness reproduced the missing body with an absent local cache.
The updated harness passed with a received collaborative document and no editor.
Regression tests cover persisted text, late arrival, stale cache replacement,
cleanup and preservation of the source document's encoded state.

`readDocument` renders an isolated Yjs replica through the same Lexical binding
and registered nodes as the editor. It never bootstraps the source. The reader
binds chapters through their existing sharing/storage persistence and follows
updates while open. Serialized cache writes retain update order. An unavailable
chapter no longer tells the person to open its note editor first.

## Reading controls

Contents provides chapter/part navigation and direct numeric page entry, with
Cover, Title page and Highlights destinations. Chapter jumps follow the chapter
while estimated page counts settle. Page controls no longer intercept typing in
an input or keyboard actions inside a menu/dialog. Saved positions are not clamped
to an incomplete book's provisional page count.

Reader actions use compact Hino controls. Center-page taps reveal quiet controls;
page-edge taps and swipes retain page turns. Showing controls does not change the
page geometry, avoiding reflow during the reveal. Keyboard focus reveals controls.
Reduce Motion disables the entrance and animated page-turn finish. Reader paper
and text follow Hino appearance roles instead of forcing bright paper on dark UI.

## Verification and remaining work

Frozen installation, lint, all-package typechecks and 439 tests, web/native
frontend builds, Worker smoke, Rust formatting, Clippy and Rust tests passed
(56 passed, 2 ignored). Android debug build succeeded. TECNO displayed the large
imported book with no missing-content prompts; Contents listed 89 entries,
chapter selection changed the visible chapter, and typing page 25 with the
keyboard open returned to page 25. Controls faded without moving the paper.
The subsequent full-width phone geometry has a regression test; its final
physical check and physical iPhone evidence remain separate.

The reader uses quiet persistence bindings, so reading all chapters does not
pin each one as an actively edited document in the device mesh.

Release checkpoint: v0.2.19. Apple processing/compliance and installation from
Google Play/TestFlight remain separate from CI upload success.

Remaining: cover-linked opening/return motion, stable text-based reading locators,
bookmarks, in-book search, reading appearance and Line Guide, sharing, orientation
lock, and Continue reading organization. Recorded audiobook playback already has
an app-owned session; read-aloud currently belongs to its reader hook and stops
on unmount. Playback continuity needs its own regression and device verification.
Large imports need profiling before compression changes. Archive discovery must
separate metadata, previews, unrestricted files and protected loans.

## Owner correction, v0.2.20

The owner rejected the full Contents sheet, permanent seek bar, oversized surface
and rigid framed page turn. Contents now uses a compact Hino Popover anchored to
its button, with a bounded, independently scrollable chapter list, trailing page
numbers and optional page entry. No input is mounted when it opens. The seek bar
is removed. Single-page turns are clipped to their reading surface and omit the
floating leaf shadow. This removes frame artifacts; it does not implement a
physical page curl. That remains the first animation task, alongside visual and
physical verification of the new popup.

The pinned iOS 26 Apple guide is
https://support.apple.com/guide/iphone/read-books-iphc1af7c57/26/ios/26.
Its reading-screen illustration places the Menu button at bottom right. Further
reader organization should follow that reference rather than expand toolbar chrome.
