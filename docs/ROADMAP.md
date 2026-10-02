# Roadmap

What exists today and what comes next. Each milestone ships to every
platform from the same `www` codebase.

## Shipped

- Local-first library: notes, journal, stories, articles, manga, lessons
  and plans, stored on the device
- Custom Lexical editor: titles, headings, quotes, lists, checklists,
  highlights, links, photos, audio clips, Markdown shortcuts
- Publishing: server-rendered public pages, hearts, likes, ratings, view
  and read counts, update and unpublish at any time, recordings and
  photos are published with the note
- Books: compile notes into books, read them with real page turns,
  narrate chapters straight into them and export them as EPUB 3
- Recording: voice notes with a live waveform and live transcription,
  stored on the device and inserted into notes
- Native storage: notes in SQLite and media as files through the Rust
  core, streamed to the app with range support; older WebView data moves
  across on first launch
- On-device Whisper in the native apps: transcribe any recording without
  it leaving the device (the model downloads once, on first use)
- Design system v2: Liquid Glass materials, motion/react transitions,
  Hugeicons dual-tone
- Desktop polish: inset layout, custom window controls, a resizable and
  customizable sidebar, Settings (theme, accent colors, text size, list
  layout), full-text search with ⌘K, and a new mark and app icons
- A welcome library for first-time users
- Tauri shell for iOS, Android, macOS, Windows and Linux

## Next

- **Toasts and dialogs**, morphing, gooey toasts for progress and results,
  and spring-animated dialogs in place of browser prompts
- **Peer-to-peer sharing**, share with family, friends or specific people
  without an account (ADR-0006)
- **Templates**, invoices and receipts with a signature anyone can scan to
  check they are genuine; quotes and social posts sized for TikTok, X and
  Instagram
- **Whisper while recording**, replace the platform recogniser with
  streaming Whisper in the native apps

## Later

- **Freeform canvas**, ink, shapes, stickies and images for planning,
  manga panels and teaching
- **Optional Pherus PassID**, cloud backup and multi-device sync
- **Learning**, lessons, flashcards and tutoring notes
