# Scope: Notables app (`www`)

Notables is a local first app for notes, journals, stories, books, comics,
audiobooks, invoices and plans, on iOS, Android, desktop and the web. This
scope covers the `www` app and the shared packages it is built on.

**Build approach:** Tracer Bullet (each feature works end to end through every layer before the next one starts).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). Connections features carry `· GA` because they touch identity and privacy.

_These are recommendations to keep the build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, go straight to `/develop`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Library and editor | Existing | existing |
| B | Publishing | Existing | existing |
| C | Books and readers | Existing | existing |
| D | Imports and exports | Existing | existing |
| E | Handwriting and drawing studio | Existing | existing |
| F | Recording and on device Whisper | Existing | existing |
| G | Invoices, receipts and quotes | Existing | existing |
| H | AI help with your own key | Existing | existing |
| I | Calendar and reminders | Existing | existing |
| J | Search, settings, setup, recycle bin | Existing | existing |
| K | Sharing by invitation link | Existing | existing |
| L | Listening (audiobooks, read along, read aloud) | Existing | in-progress |
| M | Six languages | Existing | in-progress |
| N | Widgets | Existing | in-progress |
| 1 | Loud, clean sound | Slice 1 | in-progress |
| 2 | Natural voice on the device | Slice 1 | in-progress |
| 3 | Cloud voices with your own key | Slice 1 | planned |
| 4 | Responsive layout for tablets and small windows | Slice 2 | planned |
| 5 | Four media kinds | Slice 3 | in-progress |
| 6 | Read aloud where it belongs | Slice 3 | planned |
| 7 | Turn audio into a book | Slice 3 | planned |
| 8 | Your identity: name and @code | Slice 4 | planned |
| 9 | People nearby | Slice 4 | planned |
| 10 | Find someone by @code | Slice 4 | planned |
| 11 | Connections screen | Slice 4 | planned |
| 12 | Share with contacts | Slice 4 | planned |
| 13 | Code tidy up | Slice 5 | planned |

## Already built

### A. Library and editor · existing
Local first library (SQLite natively, IndexedDB on the web) and the custom Lexical editor. code in `www/src/features/library`, `www/src/features/notes`, `shared/editor`

### B. Publishing · existing
Server rendered public pages with hearts, ratings and counts; unpublish at any time. code in `www/src/features/publishing`

### C. Books and readers · existing
Books with page turns, highlights, series, comic and manga readers. code in `www/src/features/books`, `www/src/features/reader`

### D. Imports and exports · existing
EPUB, PDF, CBZ and audio imports; EPUB, PDF, Word, HTML, Markdown, text, CBZ and audiobook exports. code in `www/src/features/imports`, `www/src/features/books/export`

### E. Handwriting and drawing studio · existing
Ink blocks with pen pressure, handwriting fonts, and a studio for comic and picture book pages. code in `www/src/features/studio`, `shared/editor`

### F. Recording and on device Whisper · existing
Voice notes with live transcription; Whisper runs in the Rust core. code in `www/src/features/recording`, `www/src-tauri/src/transcription`

### G. Invoices, receipts and quotes · existing
Signed seal, QR and number checks, hidden tamper mark, PDF, business profile. code in `www/src/features/invoices`, `shared/core/src/invoicing`

### H. AI help with your own key · existing
Writing help through Claude, Gemini or OpenRouter, off by default. code in `www/src/features/ai`

### I. Calendar and reminders · existing
Plans, birthdays, repeats, notifications, chime and vibration. Phone scheduling is untested on a device. code in `www/src/features/calendar`, `shared/core/src/calendar`

### J. Search, settings, setup, recycle bin · existing
Full text search, appearance settings, first run setup, seven day recycle bin. code in `www/src/features/search`, `www/src/features/settings`, `www/src/features/setup`, `www/src/features/trash`

### K. Sharing by invitation link · existing
Peer to peer sharing of one note through an invitation link; works while both devices are online. Slice 4 builds people and contacts on top of it. code in `www/src/features/sharing`, `shared/sync/src/peer`

### L. Listening (audiobooks, read along, read aloud) · in-progress
App wide audiobook session, read along with Whisper, read aloud with device or Gemini voices. Gemini voices are untested with a real key; voice quality is Slice 1. code in `www/src/features/listening`

### M. Six languages · in-progress
English, French, Spanish, Portuguese, Swahili and Arabic with RTL. Deeper screens (invoice editor, importers, reader labels) are still English. code in `www/src/i18n`

### N. Widgets · in-progress
Desktop Today widget works; iOS and Android widget sources exist but have never been compiled into mobile projects. code in `www/src/features/widgets`, `www/src-tauri/widgets`

## Slice 1: Voices and sound

### 1. Loud, clean sound · in-progress
Every sound the app makes plays at full loudness, so the device volume alone decides how loud it is: reminder chimes, generated voices, audiobooks. Device voices are listed once each.
**Done when:** the reminder chime and read aloud are clearly audible at normal device volume on Linux, macOS, Windows, iOS and Android, and the voice picker shows no duplicates.
- [x] Build it: `/develop loud, clean sound` (commit 97a0d83)
- [ ] Verify it: `/check verify loud, clean sound`
- [ ] Test it: `/test loud, clean sound`
code in `www/src/features/listening/lib`, `www/src/features/calendar/lib/alert-feedback.ts`

### 2. Natural voice on the device · in-progress
A premium sounding voice you download once that reads offline and privately on every platform, with the calm, Apple like feel you want. It also replaces the robotic built in voice on Linux.
**Done when:** after one download, read aloud uses a natural voice with no connection and no key, on desktop and phones, and starts speaking within about a second.
- [x] Design it (spec): `/architect natural voice on the device`
- [ ] Build it: `/develop natural voice on the device`
  - [x] Models served from R2 and downloaded, checksummed and resumable in Rust, with the bucket and database renamed (AC-7, AC-11, AC-14)
  - [x] Supertonic speaking in read aloud on desktop: Rust synthesis, the natural voice engine, ranking and content language (AC-3, AC-4, AC-5, AC-6, AC-12, AC-13)
  - [x] Automatic, manageable and updatable packs in Settings > Listening (AC-1, AC-2, AC-8, AC-9, AC-15)
  - [ ] Whisper moved onto the same packs, every string in six languages (AC-10, AC-16)
- [ ] Verify it: `/check verify natural voice on the device`
- [ ] Test it: `/test natural voice on the device`
spec [0001](../../specs/www/0001-natural-voice-on-device/index.md)
code in `www/src-tauri/src/models`, `www/src-tauri/src/voice`, `www/src/features/listening`, `www/src/server/models`, `scripts/models`

### 3. Cloud voices with your own key · needs a decision
ChatGPT quality voices for people who add their own key, alongside Gemini's. The default should feel like ChatGPT's Juniper: open and upbeat, and speaking whatever language the text is in. Juniper itself is only in the ChatGPT app, so the spec picks the closest voice developers can use (likely `marin`) and steers its tone to match.
**Done when:** with a key added in Settings, the voice picker offers the cloud voices with a Juniper like default that sounds open and upbeat, reads each passage in its own language without a language setting, plays at full loudness, and is hidden without a key.
- [ ] Design it (spec): `/architect cloud voices with your own key`

## Slice 2: Responsive layout

### 4. Responsive layout for tablets and small windows · needs a decision
Desktop and web layouts adapt to tablet widths and to small desktop windows, so controls never crowd each other. Today the Publish button and the "Saved on this device" indicator get pushed out of place in a narrow window.
**Done when:** at every width from a phone to a wide monitor, and on tablets in both orientations, the editor bar, sidebar and lists stay usable with nothing overlapping or pushed off screen.
- [ ] Design it (spec): `/architect responsive layout`

## Slice 3: Media kinds

### 5. Four media kinds · in-progress
Books, comics, manga and audiobooks become four distinct kinds, each with its own shelf and its own tools, instead of formats bolted onto one book type.
**Done when:** every item in the library is clearly one of the four kinds, imports land in the right one, and each kind shows only the actions that fit it.
- [x] Design it (spec): `/architect four media kinds`
- [x] Build it: `/develop four media kinds`
  - [x] Kinds everywhere: stored kind, four shelves, New menu, actions per kind, comic and manga switching, adding files (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-21)
  - [x] Delete and restore a whole series through Recently Deleted (AC-16, AC-17, AC-18, AC-19)
  - [x] Franchises, parts and loose chapters (AC-8, AC-9, AC-10, AC-11)
  - [x] Imports that guess the kind, find parts, merge into series and offer franchises (AC-12, AC-13, AC-14, AC-15)
  - [x] Every new string in six languages (AC-20)
- [ ] Verify it: `/check verify four media kinds`
- [ ] Test it: `/test four media kinds`
spec [0002](../../specs/www/0002-four-media-kinds/index.md)
code in `www/src/features/books`, `www/src/features/imports`, `www/src/features/trash`

### 6. Read aloud where it belongs · needs a decision
Read aloud is offered for books and comics (text you can hear), never for audiobooks, which already have sound.
**Done when:** read aloud appears on books and comics, not on audiobooks, and uses the voice chosen in Slice 1.
- [ ] Design it (spec): `/architect read aloud where it belongs`

### 7. Turn audio into a book · needs a decision
Transcription turns audio into text: for audiobooks (so they can be read along or read as text), and for books you write by speaking.
**Done when:** you can turn an audiobook, or your own recorded chapters, into a readable book whose text stays timed to the audio.
- [ ] Design it (spec): `/architect turn audio into a book`

## Slice 4: Connections

### 8. Your identity: name and @code · needs a decision · GA
You pick a display name; the device adds a short code tied to its key (for example `@lani·4F2K`), so you are unique without an account. Pherus PassID later swaps in a real handle.
**Done when:** you can set your name, see and copy your @code, and the code stays the same on that device and proves it is you.
- [ ] Design it (spec): `/architect your identity`

### 9. People nearby · needs a decision · GA
People using Notables on the same Wi-Fi appear by name automatically, like AirDrop. Nobody is listed to the whole world.
**Done when:** two devices on one network see each other by name and @code within seconds, and you can turn being visible off.
- [ ] Design it (spec): `/architect people nearby`

### 10. Find someone by @code · needs a decision · GA
Anyone not nearby can be found by typing their exact @code; there is no public directory to browse.
**Done when:** typing a valid @code of someone online finds them, a wrong one finds nobody, and partial codes reveal nothing.
- [ ] Design it (spec): `/architect find someone by code`

### 11. Connections screen · needs a decision
One place listing your contacts, your active connections, and people available now, where you add someone as a contact or remove them.
**Done when:** you can add a nearby or found person as a contact, see who is online, and remove a contact; the list survives a restart.
- [ ] Design it (spec): `/architect connections screen`

### 12. Share with contacts · needs a decision · GA
Publishing stays public (everyone can see it). Sharing becomes picking specific contacts, building on today's invitation links.
**Done when:** you can share a note with chosen contacts in a couple of taps, they get it when online, and you can revoke one person without affecting the others.
- [ ] Design it (spec): `/architect share with contacts`

## Slice 5: Cleanup

### 13. Code tidy up · needs a decision
A pass over the codebase to remove duplication, dead code and inconsistent patterns, so new features land on clean ground. The list of cleanups lives with the spec.
**Done when:** the agreed cleanups are done, nothing behaves differently, and lint, typecheck, tests and both builds pass.
- [ ] Design it (spec): `/architect code tidy up`

## Deferred
Kept so the plan stays honest; not in this pass.
- **Translate the remaining screens**: invoice editor, importers, reader labels
- **Whisper while recording**: streaming transcription in the native apps · needs a decision
- **Native home screen widgets**: generate the mobile projects and build the widgets in · needs a decision
- **Social post templates**: sized for TikTok, X and Instagram · needs a decision
- **Freeform canvas**: shapes, stickies and images · needs a decision
- **Pherus PassID**: optional sign in, cloud backup, and a relay so sharing works when people are not online together (ADR 0005, 0006) · needs a decision · GA
- **Learning**: lessons, flashcards and tutoring notes · needs a decision
- **Natural voice in the browser**: the same voice pack on the web build with onnxruntime-web, stored in the Origin Private File System · from spec 0001 · needs a decision
- **Stop writing old book fields**: drop `format` and `direction` once every app version reads `kind` · from spec 0002 · needs a decision
- **Series screen and Move to Volume**: a page per series, and moving loose chapters into a volume · from spec 0002 · needs a decision
- **Natural Swahili voice**: when an open Swahili voice with a license that allows commercial use appears · from spec 0001 · needs a decision

## Legend

**The decision box.** Each feature has one box whose label ends with `(spec)`; skills find it by that suffix. Every other box is an execution box.

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` | `Design it` ticked, spec linked, `Build it` with 2 to 5 milestones, then `Verify it` and `Test it` (GA adds `Review it` and `Document it`) |
| `in-progress` (building) | `/develop` | milestones tick one by one; code pointer filled |
| `done` | you, when you decide; `/sync` reconciles | the boxes you ran ticked |

- **Next step** is the first unticked box.
- **needs a decision** means run `/architect` first; the tag drops once the spec exists.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (kept for history).
- **`· GA`** beside a heading means that feature also gets a fresh model `/check review` and `/document`.
- Build tasks live in each spec's `## Build plan`, not here.
