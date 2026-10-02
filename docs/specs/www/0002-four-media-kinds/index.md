# 0002. Four media kinds with franchises, series, volumes and parts

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Every item in the Books area becomes clearly one of four kinds: book, comic, manga or audiobook. Each kind gets its own shelf and shows only the actions that fit it. The structure around items grows two optional levels. A franchise groups series across kinds (the One Piece manga, novels and audiobooks). A part groups chapters inside one item (Part One, Part Two). Imports guess the kind per series, find parts, and merge into series you already have. You can also delete a whole series at once, to Recently Deleted, and restore it as one unit.

## Requirements

**User stories**:
- As a reader, I want every item to be plainly a book, comic, manga or audiobook, with its own shelf, so that I find things by what they are.
- As a reader, I want each kind to offer only the actions that make sense for it, so that menus stay short and never offer something that cannot work.
- As a collector, I want to group the manga, novels and audiobooks of one world under a franchise, so that they sit together without mixing shelves.
- As a reader of long books, I want chapters grouped into parts, so that the contents read like the printed book.
- As someone importing a folder of volumes, I want them to land in the right kind, join the series I already have, and keep their parts, so that I never tidy up after an import.
- As someone done with a series, I want to delete it all at once and still be able to undo it for a week.

**Acceptance criteria**:
- **AC-1**: Every item and every series has exactly one kind: `book`, `comic`, `manga` or `audiobook`. Items and series saved before this feature show the kind their old `format` and `direction` imply (prose is book, comic with `rtl` is manga, other comics are comic, audio is audiobook), and opening the library writes nothing to them.
- **AC-2**: The Books list has a segmented control with All, Books, Comics, Manga and Audiobooks. A kind with no live items is hidden from it; with an empty library only All shows. A kind shelf shows only that kind. The choice is remembered on this device and restored on the next launch. Whenever the selected kind has no live items (at launch, or right after its last item is deleted), the control falls back to All.
- **AC-3**: The New menu offers Book, Comic, Manga and Audiobook. A new audiobook opens on its book screen with the existing record chapter flow as the main action. An audiobook left empty stays as an empty item, as an empty book does today.
- **AC-4**: Each kind shows only its actions. Book: Read, Export (EPUB, PDF, Word, HTML, Markdown, text), New chapter. Comic and Manga: Read, Export (CBZ, PDF, EPUB, images, HTML), Draw page, and "Switch to Manga" or "Switch to Comic". Audiobook: Listen, Export (audiobook ZIP, EPUB, HTML, text), Record chapter, Add audio. No book shows Draw page; no comic or manga shows Record chapter; no audiobook shows Read or Draw page.
- **AC-5**: "Switch to Manga" or "Switch to Comic" on a standalone item changes its kind and reading direction, and the note `kind` of its chapters. On an item in a series the action reads "Switch Series to Manga" (or Comic) and changes the series, every item in it (trashed ones included) and all their chapters, in one Yjs transaction. The reader opens in the new direction at the same page.
- **AC-6**: An item qualifies as an audiobook when it has at least one live chapter and every live chapter is a recording. A book becomes an audiobook by itself only when it qualifies and is standalone, or when every live item in its series that has chapters qualifies, in which case the series and all its items (trashed ones included) switch together. Items with no chapters never block the switch. The check runs from the same triggers as today. Otherwise it stays a book.
- **AC-7**: Every action in this version keeps an item's kind equal to its series' kind; none puts an item into a series of another kind. If sync or an older app version leaves a mismatch, the series kind decides how the item is shown and read, and the next write to that item corrects its kind.
- **AC-8**: From a series' menu, "Add to Franchise" creates a franchise (its name starts as the series title and can be edited) or adds the series to an existing one, picked from a list of franchise titles. Two franchises may share a name. A franchise can hold series of any kinds, can be renamed, and "Remove Franchise" ungroups it: every series stays, nothing is deleted.
- **AC-9**: On the All shelf a franchise is a heading with its series beneath it, ordered Books, Comics, Manga, Audiobooks, then by title. On a kind shelf, series stand alone and show their franchise name as a subtitle. A franchise with no live series is hidden, and it is removed once its last series is erased.
- **AC-10**: An item can have parts. In the book screen you can start a part at any chapter, rename it and remove it. The contents list, the reader's contents and the audiobook chapter list show part headings. EPUB exports nest each part's chapters under it; PDF, Word, HTML and Markdown exports print the part title as a heading before its first chapter. Reading order is unchanged by parts. Chapters before the first part belong to no part.
- **AC-11**: In a comic or manga series, an item with no volume number is shown with the title "Chapters" and listed after the numbered volumes; several such items list oldest first.
- **AC-12**: The import preview shows a kind per series. E-books, PDFs and prose are Book, audio is Audiobook, and those are fixed. For page images and comic archives the preview offers a picker with Comic and Manga only, set to a guess from, in order: a CBZ `ComicInfo.xml` with `Manga` set to `YesAndRightToLeft` (manga) or `No` (comic), an EPUB spine with `page-progression-direction="rtl"` (manga), and "manga" anywhere in the series folder name, ignoring case (manga). `Yes`, `Unknown` or a malformed file count as no hint. When volumes of one series disagree, the hint most of them carry wins. With no hint the guess is Manga. The picked kind is what gets imported.
- **AC-13**: In an EPUB table of contents, each top level entry that holds nested entries imports as a part, its nested entries as its chapters. When that top level entry points at text of its own, the text becomes the part's first chapter. Top level entries without children are chapters with no part. Audio tracks inside a folder whose whole name is "Part" followed by a number or a number word (for example "Part 3", "Part Three") import as a part with that name. Other imports have no parts.
- **AC-14**: When an imported series has the same kind and the same title as a live series (ignoring case, accents, punctuation and spacing), the preview names the target and the exact volume numbers added, for example "Adds Volumes 4, 6 and 9 to One Piece", and the new items join that series. A planned item whose volume number the series already has is skipped and listed in the preview; an item with no volume number is never treated as a duplicate. Several planned series in one import with the same kind and title are combined into one. Unticking the merge imports it as a separate series.
- **AC-15**: When an imported series' title matches a series that sits in a franchise, but the kind differs or there is no merge, the preview offers "Join franchise One Piece", ticked by default and visible before import. When matches sit in several franchises, the most recently updated one is offered. Imports never create a franchise.
- **AC-16**: A series heading's menu has "Delete Series…". It confirms with the series title and its count of items and chapters, then moves the series and all its live items (with their own chapters) to Recently Deleted as one batch, in one Yjs transaction, and a toast offers Undo. In Select mode a series heading can be selected as one unit, alongside single items.
- **AC-17**: Recently Deleted shows a deleted series as one row (title, kind, item count, days left), sorted with the other rows by when it was deleted, not as its items. Restoring it brings back the series and exactly the items deleted in its batch, with their chapters. Single items inside the row cannot be restored on their own. An item deleted on its own earlier stays in the bin as its own row; restoring it makes it live, so its series shows on the shelf again with it.
- **AC-18**: After 7 days, or on "Erase Now" or "Empty Bin", a deleted series' batch items are erased the way a single item is (own chapters, media, cover, highlights), and the existing `eraseBook` cleanup removes the series once no item names it. Items outside the batch are never erased by it. Erasing checks each item's batch at the moment it runs, so it is safe to repeat and to resume after a crash.
- **AC-19**: If another device adds an item to a series while it sits in Recently Deleted, the series shows on the shelf again with just the live items, and the bin row keeps the batch items, which restore or erase as normal.
- **AC-20**: Every new string is translated in all six catalogs, counts use each catalog's plural forms, and the shelves, part headings and import preview read correctly right to left in Arabic.
- **AC-21**: Adding files to an existing item (the book screen's add flow) keeps the item's kind: files that do not fit it are skipped and listed, an audiobook's "Add audio" accepts audio only, and parts are detected as on import.

## Decision

**Chosen option**: Option 1: Explicit kind and new levels on the existing stores.

Add a stored `kind` to items and series (read from `format` and `direction` when missing), a new `franchises` map, part markers on items, and a `trashBatch` id that ties a deleted series to the items deleted with it, all inside the existing library Yjs document. Reasoning and options are in [rationale.md](rationale.md).

## Feature design

**Data model sketch** (all in the library `Y.Doc`, no D1 or SQLite schema change):

| Entity (Y.Map) | Fields | Relations |
|---|---|---|
| `FranchiseEntry` in `franchises` (new) | `id` (uuid v7, required), `title` (1 to 120, required), `createdAt`, `updatedAt` | 1 franchise : N series of any kinds |
| `SeriesEntry` in `series` | existing `id`, `title`, `author`, `partLabel`, timestamps; new `kind?: MediaKind` (missing on old entries), `franchiseId?: string \| null`, `trashedAt?: number \| null`, `trashBatch?: string \| null` (uuid of the delete that took it). `format` is still written for older app versions and read only as the fallback | N series : 0..1 franchise; 1 series : N items, one kind |
| `BookEntry` (an item: a volume or a standalone) in `books` | existing fields; new `kind?: MediaKind`, `parts?: Part[]`, `trashBatch?: string \| null`. `format` and `direction` are still written, derived from kind | N items : 0..1 series; 1 item : N chapters in `chapterIds` order |
| `Part` (embedded in `BookEntry.parts`) | `id` (required), `title` (1 to 120, required), `startsAt` (a chapter id in `chapterIds`, required) | A part runs from `startsAt` to the next part's start, or to the end |
| Chapter (`LibraryEntry` note, unchanged) | `bookId` names the owning item | N chapters : 1 item |

`MediaKind = "book" | "comic" | "manga" | "audiobook"` lives in `www/src/features/books/model/media-kind.ts` with:
- `kindFromFormat(format, direction)`: prose is book, comic with `rtl` is manga, other comics are comic, audio is audiobook.
- `storedKind(book)`: `book.kind` when `formatOf(kind)` and `directionOf(kind)` match the stored `format` and `direction`; otherwise (no `kind`, or an older app version changed `format` or `direction` since) `kindFromFormat(format, direction)` (AC-1).
- `seriesKind(series, items)`: `series.kind`, else the stored kind of its first item, else from `series.format` (comic reads as comic).
- `itemKind(book, series?)`: for an item in a series, `seriesKind` (the series decides, AC-7); otherwise `storedKind(book)`.
- Every write to an item or series goes through the stores' `update`, which sets `kind` to the kind just read and refreshes `format` and `direction`, so a mismatch heals on the next edit.
- `formatOf(kind)` and `directionOf(kind)`: `book` is prose and ltr, `comic` is comic and ltr, `manga` is comic and rtl, `audiobook` is audio and ltr. Every write of `kind` also writes these two, so older app versions on other devices keep working.

Kind order for sorting and the segmented control: book, comic, manga, audiobook.

**State transitions** (series in the bin):
- live → deleted: in one transaction, a new uuid `B`; `series.trashedAt = now`, `series.trashBatch = B`; every live item gets `trashedAt = now`, `trashBatch = B`, with their own chapters (AC-16).
- deleted → live: in one transaction, clear `trashedAt` and `trashBatch` on the series and on every item whose `trashBatch === B` (AC-17).
- deleted → erased: for each item, read it again and erase it through `eraseBook` only if its `trashBatch` is still `B`; `eraseBook` already removes the series once no item names it. If items outside the batch remain, clear the series' `trashedAt` and `trashBatch` (AC-18, AC-19).
- "Series in the bin" means `series.trashBatch` is set and at least one item carries that batch. A series with live items also shows on the shelf (AC-19).
- A single item restored on its own clears its `trashedAt` and `trashBatch`, leaving the batch.
- An item's own kind changes only comic ⇄ manga by hand, or book → audiobook by the automatic rule (AC-5, AC-6).

**Interface surface** (local actions; no server routes change):

| Action (module) | Inputs | Result | Errors and guards |
|---|---|---|---|
| `getFranchiseStore()` create, rename, remove (`books/store/franchise-store.ts`) | `title` | `FranchiseEntry` | Remove also clears `franchiseId` on its series |
| `setSeriesFranchise(seriesId, franchiseId \| null)` (`books/actions/franchise.ts`) | ids | series updated | No-op for an unknown id |
| `switchComicKind(target)` (`books/actions/switch-kind.ts`) | an item or a series, `"comic" \| "manga"` | in one `doc.transact`: kind, format, direction on the item, or on the series and all its items (trashed included), plus the note `kind` of every chapter they own | Refused for book and audiobook |
| `syncBookFormat(bookId)` (existing, changed) | id | may switch the item, or its whole series in one transaction, to audiobook | Follows AC-6; loads sibling chapters only when the item is in a series |
| `appendToBook(bookId, files)` (existing, changed) | id, files | chapters added to the item, kind unchanged | Files whose kind does not fit are skipped and returned in `skipped`; parts detected as on import (AC-21) |
| `getBookStore().create(kind)` (existing, kind replaces shelf) | `MediaKind` | new item | |
| `addPart`, `renamePart`, `removePart` (`books/actions/parts.ts`) | item id, chapter id, title | `parts` updated, sorted by chapter position | `startsAt` must be in `chapterIds`; one part per start chapter |
| `chapterOutline(book, isLive)` (`books/lib/chapter-outline.ts`) | `BookEntry`, a live chapter test | `{ part?: Part, chapterIds }[]` in reading order, live chapters only | Ignores markers whose `startsAt` is not in `chapterIds`; a part whose start chapter is in the bin shows from its first live chapter; a part with no live chapter is not shown |
| `BookStore.removeChapter`, `moveChapter`, `forgetNote` (existing, changed) | as today | also repair `parts` in the same `update` | Removing a part's start chapter moves the marker to the next chapter that was in that part, or drops it; a marker ending up before another part's start is kept in chapter order |
| `moveSeriesToBin(series[], books[])`, `restoreSeries`, `eraseSeries` (`trash/lib/recycle-bin.ts`) | series entries, plus single items picked in Select mode | as in State transitions | Undo reverses by the same batch id |
| `binContents()` (existing, changed) | | `{ notes, books, series }`; items carrying their series' batch are folded into the series row; chapters of any trashed item stay hidden, as today | |
| `recently-deleted-screen.tsx` (existing, changed) | | a `series` row type with Restore and Erase, days left from `series.trashedAt`; copy says notes, books and series | |
| `buildImportPlan(files, library)` (existing, changed) | files, plus a snapshot of live series and franchises | `PlannedSeries` gains `kind`, `kindHint`, `mergeInto?`, `franchiseId?`, `skippedVolumes`; `PlannedBook` gains `parts`; planned series with equal kind and match key are combined | Pure, as today; hints from archive and EPUB contents are added once the files are read, before the preview shows |
| `runImport(plan, options)` (existing, changed) | plan with per series `kind` | creates or merges series, writes kind, parts, franchise | `options.comicKind` is removed |
| `readComicArchive` (existing, changed) | bytes | also returns `mangaHint: "manga" \| "comic" \| null` from `ComicInfo.xml` | Malformed XML is no hint |
| `readEpub` (existing, changed) | bytes | also returns `rtl: boolean` and `parts: { title, firstChapterPath }[]` from nested nav `ol` or nested NCX `navPoint` | `runImport` maps `firstChapterPath` to the chapter it wrote from that file; if that file produced no chapter, the part starts at the next chapter written, or is dropped |
| `Preferences.booksShelf` (`settings/model/preferences.ts`) | | `"all" \| MediaKind` | `normalizePreferences` turns a missing or unknown value into `"all"` |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Any shelf, menu, reader or exporter | an item's kind | `itemKind(book, series)` as defined above |
| Readers and exporters | reading direction | `directionOf(itemKind(...))`, never `book.direction` directly |
| New chapter (`start-chapter.ts`) | the chapter note's kind | from `itemKind`: comic and manga give note kinds `comic` and `manga`, book gives `story`, audiobook gives `note` |
| New audiobook | stored fields | `kind: "audiobook"`, `format: "audio"`, `direction: "ltr"` |
| Shelf | a series' kind | `seriesKind()`: `SeriesEntry.kind`, else its first item, else `series.format` |
| Shelf | unnumbered item order | `createdAt` ascending, after numbered volumes |
| Add to Franchise | list of franchises | live `franchises` entries by title; duplicates are shown with their series count |
| Segmented control | the selected shelf | `Preferences.booksShelf` (new, `"all" \| MediaKind`, default `"all"`) in the per device preferences store (`localStorage`) |
| Segmented control | which kinds are shown | derived: kinds with at least one live item |
| New menu | new item's kind | the menu entry picked |
| Kind actions | the action list | `itemKind()` via `actionsFor(kind)` in `books/lib/kind-actions.ts`; export lists stay in `formatsFor`, now keyed by kind |
| Switch comic or manga | new direction | `directionOf(kind)` |
| Auto audiobook | whether to switch | live chapters are all recordings (existing `isRecordingChapter`) and the item is standalone or every live sibling qualifies |
| Franchise heading | title | `FranchiseEntry.title` |
| Franchise heading | cover | derived: the cover of the first item of the first series in kind order, else the generated cover |
| Franchise create | starting title | the series' `title` |
| Kind shelf subtitle | franchise name | `FranchiseEntry.title` via `SeriesEntry.franchiseId` |
| Series heading | count label ("3 volumes") | live item count + `partLabel`; exactly `Book`, `Volume` and `Season` (case sensitive) are shown through `t()` with the catalog's plural forms, any other stored label is shown as is |
| Item in series | "Chapters" label | `volume === null` and series kind is comic or manga |
| Contents and reader | part headings | `chapterOutline(book)` from `BookEntry.parts` |
| Import preview | kind guess | per volume: `ComicInfo.xml` `Manga` (`YesAndRightToLeft` or `No` only), else EPUB `page-progression-direction`, else "manga" in the series folder name; per series: the hint most volumes carry, else Manga; prose and audio are fixed as book and audiobook |
| Import preview | merge target | live series with equal `kind` and equal `seriesMatchKey(title)` (lowercase, accents removed by NFKD, punctuation removed, spaces collapsed) |
| Import preview | "Adds Volumes 4, 6 and 9" | the exact `volume` numbers of planned items not already in the target, plus a count of unnumbered ones |
| Import preview | skipped volumes | planned non null `volume` numbers already present on live items of the target |
| Import preview | franchise offer | the `franchiseId` of the most recently updated live series with equal `seriesMatchKey`, any kind |
| Import | parts | `readEpub().parts`, or an audio folder segment whose whole name is "Part" plus a number or an English number word one to twenty (`partFolder()` in `part-names.ts`) |
| Delete Series confirm | counts | live items with `seriesId`, sum of their `ownChapters` |
| Delete toast | label | count of series plus count of single items in the action |
| Series delete | batch id and time | `createId()` and `Date.now()`, once per delete action |
| Bin row | title, kind, count, days left | `SeriesEntry` + items with `trashBatch === series.trashBatch`; days left from `series.trashedAt` |
| Erase timing | expiry | `series.trashedAt` with the existing `isExpired` and `RETENTION_DAYS` |

**Key invariants**:
- `itemKind(item) === seriesKind(series)` for every item with a `seriesId` (AC-7). Import merge, `switchComicKind` and the auto audiobook rule are the only writers that change a kind, and each keeps it. A mismatch left by sync or an older version is read through the series and healed on the item's next write.
- Edits to an entry replace the whole entry (`Y.Map.set` of the object, as today), so two devices editing the same item or series at the same moment keep only the last write, `parts` and `chapterIds` included. This spec accepts that known limit; multi entry changes (series switch, series delete, restore, franchise removal) run in one `doc.transact` so each device applies them whole.
- A franchise holds no items and is never put in the bin. It is hidden when it has no live series and removed when its last series is erased.
- An item has a `trashBatch` only while it is in the bin as part of a series delete; restoring or erasing clears it.
- Erase is safe to repeat: each step checks the current entry first, missing media are ignored (as today), and `eraseExpired` runs on every device as it does now.
- Every `kind` write also writes the matching `format` and `direction`.
- `parts[].startsAt` names a chapter in `chapterIds`; readers ignore any marker that does not, and the next edit of the item drops it. `BookStore` keeps markers right on every chapter change (see the interface table); `parts` stay sorted by their chapter's position.
- A series shows on the shelf exactly when it has live items, whatever its `trashBatch` (AC-19).
- Opening the library never writes; kind backfill happens only as part of a real edit.

**Security model**: Unchanged. Everything here is in the person's own local library document and syncs only between their own devices through the existing Yjs persistence. Sharing with people shares notes, not items, series or franchises. No new data leaves the device and no regulated data is involved.

**Configuration required**: None.

**Critical test scenarios**:
- Happy path: import a folder holding a CBZ with `ComicInfo.xml` Manga `YesAndRightToLeft`, an EPUB with nested parts and an audiobook folder with "Part 1" and "Part 2"; the preview shows Manga, Book and Audiobook with parts; after import each sits on its own shelf with its parts in the contents. Verifies **AC-1**, **AC-2**, **AC-12**, **AC-13**.
- Merge: import Volumes 3 to 5 of a series that already has 1 to 4; the preview says "Adds Volume 5" and lists 3 and 4 as skipped; unticking makes a separate series. Two folders with the same series title in one import become one series. Verifies **AC-14**.
- Whole series delete: delete a three volume series where volume 2 was already binned on its own; the bin shows the series row plus volume 2 on its own; restoring the series brings back 1 and 3 only; erasing after expiry removes chapters and covers. Verifies **AC-16**, **AC-17**, **AC-18**.
- Sync race: with a series in the bin, apply a remote Yjs update adding a live item to it; the shelf shows the series with that item; erase keeps it and keeps the series. Verifies **AC-19**.
- Legacy data: a library saved before this feature (no `kind`, comic + `rtl`) shows as manga and the Yjs document has no new updates after load. An item with `kind: "book"` but `format: "audio"` (an older version's switch) reads as audiobook. Verifies **AC-1**, **AC-7**.
- Add files: add a CBZ to a book; it is skipped and listed, and the book stays a book. Add an EPUB with parts to a book; the parts appear. Verifies **AC-21**.
- Parts upkeep: delete the chapter a part starts at; the part starts at the next chapter of that part. Bin it instead; the outline shows the part from its next live chapter. Verifies **AC-10**.
- Restart during erase: interrupt `eraseExpired` halfway through a series batch, run it again; everything in the batch is gone, nothing outside it. Verifies **AC-18**.
- Kind invariant: switch one manga volume of a series to comic; every volume, including a trashed one, switches; auto audiobook does not switch a book inside a mixed series. Verifies **AC-5**, **AC-6**, **AC-7**.
- Franchise: add a manga series and an audiobook series to "One Piece", remove the franchise, and both series remain. Verifies **AC-8**, **AC-9**.

## Build plan

Tracer Bullet (from the scope header): each slice works end to end, from store to screen, before the next starts. Each slice adds the part of the data model it needs; no slice changes the shape another slice wrote.

1. **Kind thread.** Add `media-kind.ts` (`MediaKind`, `kindFromFormat`, `storedKind`, `seriesKind`, `itemKind`, `formatOf`, `directionOf`) and have the stores' `update` write `kind` with `format` and `direction`. Replace `bookFormat`, `bookShelf`, `bookKindLabel` and every direct read of `format` or `direction` with `itemKind` and `directionOf`: `export-book.ts` (`formatsFor`), `book-material.ts` (`isDrawnBook`), `build-archives.ts`, `build-html.ts`, `build-pdf.ts`, `comic-reader.tsx`, `routes/read/$bookId.tsx`, `routes/_app/books/$bookId.tsx`, `start-chapter.ts` (`chapterKind`), `book-screen.tsx`, `book-shelf.tsx`, `books-list.tsx`. `create(kind)`; seed the welcome shelf (`seed-welcome-shelf.ts`) with `kind`; the segmented control with `Preferences.booksShelf`; the four entry New menu with an audiobook opening on the record flow; `actionsFor(kind)`. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
2. **Kind changes.** `switchComicKind` for items and whole series, chapters' note kinds included, in one transaction; change `syncBookFormat` to the series aware rule; guard every series assignment by kind; `appendToBook` keeps the item's kind and skips files that do not fit. Satisfies **AC-5**, **AC-6**, **AC-7**, **AC-21**.
3. **Whole series delete.** `trashedAt` and `trashBatch` on series, `trashBatch` on items; `moveSeriesToBin` with one batch and Undo, in one transaction; series heading menu and Select mode selection of series; the `series` row in `recently-deleted-screen.tsx` and `binContents`; `restoreSeries`; a resumable `eraseSeries` in `eraseExpired` and `emptyBin`; shelf rule for live items in a deleted series. Satisfies **AC-16**, **AC-17**, **AC-18**, **AC-19**.
4. **Franchises.** `franchise-store.ts`, `setSeriesFranchise`, "Add to Franchise" with the list of existing franchises, rename and "Remove Franchise" (one transaction); franchise grouping on All, subtitles on kind shelves and hiding empty franchises in `arrangeShelf`; removing a franchise when its last series is erased. Satisfies **AC-8**, **AC-9**.
5. **Parts and loose chapters.** `parts` on `BookEntry`, `parts.ts` actions, marker upkeep in `BookStore.removeChapter`, `moveChapter` and `forgetNote`, `chapterOutline`; part headings in the book screen, reader contents and audiobook chapter list; nested EPUB nav in `build-epub.tsx` and part headings in the PDF, Word, HTML and Markdown builders; the "Chapters" title and oldest first ordering for unnumbered comic and manga items. The highlights panel and the audiobook session stay unchanged. Satisfies **AC-10**, **AC-11**.
6. **Imports.** `mangaHint` in `readComicArchive`, `rtl` and `parts` in `readEpub`, `partFolder()` for audio; majority hint per series; the Comic or Manga picker in `import-sheet.tsx` replacing the single toggle; combining same key planned series; merge by `seriesMatchKey` with skipped volumes; the franchise offer; `runImport` writing kind, parts, merge and franchise; part detection in `appendToBook`. Satisfies **AC-12**, **AC-13**, **AC-14**, **AC-15**, **AC-21**.
7. **Language pass.** Move every string touched above (including the English left in `recycle-bin.ts` and `books-list.tsx`) into all six catalogs and check the new surfaces in Arabic; plural forms for counts; `normalizePreferences` defaulting `booksShelf` to `"all"`. Satisfies **AC-20**, **AC-2**.

## Migration plan

**Strategy**: no data migration. New fields are optional and read through fallbacks.
**Phases**:
1. Ship reading (`itemKind`, `seriesKind`) and writing (`kind` plus `format` and `direction`) together in slice 1.
2. Old entries gain `kind` only when they are next edited.
3. A later cleanup may stop writing `format` and `direction` once every device runs a version that reads `kind` (see Follow-up).
**Rollback**: revert the commits. Older builds ignore `kind`, `parts`, `franchiseId`, `trashedAt` on series and the `franchises` map, and still find valid `format` and `direction` on every item.
**Risks**: an older build on a second device can switch a book to audio by the old rule inside a series, or add an item of another kind to a series. Newer builds read such an item through its series kind and heal it on the next write. An older build's change to `format` or `direction` on a standalone item is honoured, because `storedKind` trusts those fields whenever they disagree with `kind`.

## Consequences

**Positive**:
- Kind is one stored fact with one helper, so shelves, menus, readers and exports stop working it out on their own.
- Readers, exporters and the audiobook session keep using the flat `chapterIds`; parts are an overlay.
- Whole series deletes reuse the existing bin, retention and `eraseBook`, so erasure stays one path.

**Negative / tradeoffs**:
- `format` and `direction` must be kept in step with `kind` until older versions are gone: two sources for one fact for a while.
- Part markers depend on chapter ids; `BookStore` must repair them on every chapter change.
- Whole entry writes mean simultaneous edits of one item on two devices keep only the last; adding parts makes that a little more visible. Fixing it (nested Y.Maps per entry) is a separate change.
- The import plan now depends on library state (for merges), so it is no longer a function of the files alone; tests must pass a library snapshot.
- Merging by title can join two different works with the same name and kind. The preview shows it and lets you untick it, but it is still a guess.

**Neutral**:
- `options.comicKind` and the single comic or manga toggle leave the import sheet.
- The export format lists are unchanged, only keyed by kind.
- Read aloud placement is left to scope feature 6.

## Follow-up

- [ ] Stop writing `format` and `direction`, and drop the fallback, once every supported app version reads `kind`. Needs a minimum version check or a later Yjs schema version.
- [ ] Consider a series screen (cover, description, all items) if the shelf heading grows too crowded; out of scope here.
- [ ] Moving chapters between items (for example loose manga chapters into a new volume) uses today's chapter actions; a dedicated "Move to Volume" action may be worth its own small spec.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
