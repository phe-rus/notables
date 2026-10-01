# 0004. A custom editor on Lexical

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

The editor is the product. It must feel bespoke, support rich blocks
(checklists, audio clips with transcripts, images, highlights, comments),
work in every WebView, and collaborate in real time.

## Decision

Build `shared/editor` on **Lexical's core** rather than a pre-styled kit:

- Our own theme, nodes and decorators (audio, image, canvas embeds).
- Our own floating selection toolbar, block toolbar and shortcuts.
- Collaboration and persistence through **`@lexical/yjs`**, bound to the
  note's Yjs document (`shared/core` layout key `root`, Lexical's default).

## Consequences

- More up-front work than a kit, full control over every pixel and motion.
- Lexical's small core keeps the WebView bundle lean on mobile.
