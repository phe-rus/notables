# 0004. Editor and canvas

- **Status:** Accepted
- **Date:** 2026-09-29

## Context

Rich text and a freeform canvas are the core surfaces. They must behave
identically across platforms and sync through the same CRDT.

## Decision

- **Rich text:** Tiptap (ProseMirror) bound to a Yjs XML fragment. Web and
  desktop use it directly; mobile hosts the same editor in a native WebView
  (TenTap) with native toolbars, so the document format is identical.
- **Canvas:** a custom scene graph stored in a Yjs map, rendered with React
  Native Skia on mobile and Skia/CanvasKit on the web. One renderer, stylus
  pressure support and 120 Hz animation everywhere.
- tldraw was rejected: web-only and requires a commercial licence.

## Consequences

- The canvas is custom work and the largest single engineering investment.
- CanvasKit adds roughly 3 MB (lazy-loaded) to the web bundle when a canvas
  is opened.
