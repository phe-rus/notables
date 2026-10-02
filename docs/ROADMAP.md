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
- Toasts and dialogs, recycle bin, highlights, bulk import of e-books,
  PDFs, comics and audiobooks, comic and manga readers
- Handwriting with pen pressure, and handwriting fonts
- Invoices, receipts and quotes with a verifiable seal, a hidden
  tamper mark, and a saved business profile
- AI writing help with your own key, off by default
- Calendar with plans, birthdays, reminders and notifications
- A drawing studio for comic, manga and picture-book pages
- Export to EPUB, PDF, Word, HTML, Markdown, text, CBZ and audiobook ZIPs
- Continuous audiobooks, read-along with on-device Whisper, and read aloud
  with natural voices
- Six languages: English, French, Spanish, Portuguese, Swahili, Arabic
- Peer-to-peer sharing with specific people (ADR-0006)
- A desktop Today widget; home-screen widget sources for iOS and Android

## Next

- Translate the remaining screens
- **Whisper while recording**, streaming Whisper in the native apps
- Native home-screen widgets built into the mobile projects
- Templates for social posts sized for TikTok, X and Instagram

## Later

- **Freeform canvas**, shapes, stickies and images for planning and teaching
- **Optional Pherus PassID**, cloud backup and multi-device sync
- **Learning**, lessons, flashcards and tutoring notes
