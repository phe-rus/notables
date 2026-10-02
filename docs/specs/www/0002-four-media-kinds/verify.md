# Verify: four media kinds · spec 0002 · updated 2026-10-02
_Steps derived from spec 0002 acceptance criteria and its value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

### Kinds, shelves and actions
- [ ] Open a library saved before this feature (a comic with `direction: "rtl"`, no `kind`) → it shows as Manga, and the library Yjs document gets no new update on load → AC-1
- [ ] An item stored with `kind: "book"` but `format: "audio"` (an older version's change) → shows and plays as an audiobook → AC-1, AC-7
- [ ] Books list with an empty library → the shelf control shows only All → AC-2
- [ ] Add a book and a manga → the control shows All, Books, Manga (kind order book, comic, manga, audiobook); Comics and Audiobooks stay hidden → AC-2
- [ ] Pick Manga, reload the app → Manga is still selected → AC-2
- [ ] On the Manga shelf, delete the last manga → the control falls back to All and Manga disappears from it → AC-2
- [ ] New menu → offers Book, Comic, Manga, Audiobook → AC-3
- [ ] New Audiobook → opens its book screen with Record chapter as the main action; leave it empty → it stays as an empty audiobook → AC-3
- [ ] Record chapter → a new chapter opens with the recorder already running → AC-3
- [ ] Book screen and row menu of a Book → Read, Export (EPUB, PDF, Word, HTML, Markdown, text), New chapter; no Draw page, no Record chapter → AC-4
- [ ] Comic or Manga → Read, Export (CBZ, PDF, EPUB, images, HTML), Draw page, Switch to Manga / Switch to Comic; no Record chapter → AC-4
- [ ] Audiobook → Listen, Export (audiobook ZIP, EPUB, HTML, text), Record chapter, Add audio; no Read, no Draw page → AC-4
- [ ] Switch to Comic on a standalone manga → kind, reading direction and its chapters' note kind change; the reader opens left to right at the same page → AC-5
- [ ] On a volume in a manga series, the action reads "Switch Series to Comic"; using it switches the series, every volume (a trashed one too) and their chapters → AC-5, AC-7
- [ ] Delete every written chapter of a standalone book that also has recordings → it becomes an audiobook → AC-6
- [ ] In a series where one volume is all recordings and another has written chapters → neither switches; when every volume with chapters is all recordings → the whole series switches → AC-6
- [ ] Add a CBZ to a Book through Add from files → it is skipped and named in the toast; the book stays a Book → AC-21
- [ ] Audiobook Add audio → the picker accepts audio only → AC-21
- [ ] Add an EPUB with nested contents to a Book → its chapters and parts appear → AC-21

### Whole series delete
- [ ] Series heading menu → Delete Series… confirms with the title and counts ("2 volumes and 2 chapters"), then the series leaves the shelf and a toast offers Undo; Undo brings it all back → AC-16
- [ ] Select mode → a series heading can be selected as one unit next to single books; Delete removes both → AC-16
- [ ] Delete Volume 2 on its own, then Delete Series → the bin shows one series row (title, kind, "2 volumes", days left) and Volume 2 as its own row → AC-17
- [ ] Restore the series row → Volumes 1 and 3 come back with their chapters; Volume 2 stays in the bin → AC-17
- [ ] Restore Volume 2 on its own → it is live and its series shows on the shelf with it → AC-17
- [ ] Erase Now on a series row (or Empty Bin, or wait past 7 days) → batch volumes, their chapters, media, covers and highlights are erased; a volume outside the batch is not → AC-18
- [ ] With a series in the bin, another device adds a volume to it → the shelf shows the series with just that volume; the bin row keeps the batch volumes → AC-19

### Franchises
- [ ] Series menu → Add to Franchise… → a sheet with existing franchises and a new franchise name prefilled with the series title → AC-8
- [ ] Two franchises with the same name → both are listed, told apart by their series count → AC-8
- [ ] All shelf → a franchise is a heading with its series beneath, books first, then comics, manga, audiobooks, then by title → AC-9
- [ ] A kind shelf → series stand alone with the franchise name as a subtitle → AC-9
- [ ] Franchise heading menu → Rename… works; Remove Franchise ungroups and every series stays → AC-8
- [ ] Erase a franchise's last series → the franchise is gone → AC-9

### Parts and loose chapters
- [ ] Chapter row menu → Start Part Here → a part heading appears, ready to name; rename it in place; remove it with its button → AC-10
- [ ] The reader shows the part title on a page of its own before its first chapter; the audiobook chapter list shows part headings → AC-10
- [ ] Export EPUB → the contents nest each part's chapters; PDF, Word, HTML, Markdown and text print the part title before its first chapter → AC-10
- [ ] Delete the chapter a part starts at → the part starts at the next chapter of that part; bin it instead → the outline shows the part from its next live chapter → AC-10
- [ ] In a manga series, an item with no volume number → titled "Chapters", listed after the numbered volumes, several oldest first → AC-11

### Imports
- [ ] Import a CBZ whose ComicInfo.xml says `No` → preview picker set to Comic; `YesAndRightToLeft` → Manga; no ComicInfo → Manga → AC-12
- [ ] A folder whose name contains "manga" → Manga; volumes disagreeing → the hint most of them carry wins → AC-12
- [ ] EPUBs, PDFs and audio show a fixed Book or Audiobook label, no picker → AC-12
- [ ] EPUB with a top level entry holding nested entries → imports as a part; a top level entry with its own text makes that text the part's first chapter → AC-13
- [ ] Audio in "Part 1" and "Part Two" folders → one book with those parts → AC-13
- [ ] Import Volumes 3 to 5 of a series that has 1 to 4 → preview says "Adds Volume 5 to …" and "Already there, skipped: Volumes 3 and 4"; after import there are no duplicates → AC-14
- [ ] Untick the merge → it imports as a separate series → AC-14
- [ ] Two folders with the same series title in one import → one planned series → AC-14
- [ ] Import an audiobook titled like a manga series that sits in a franchise → preview offers "Join franchise …", ticked; after import the audiobook series is in that franchise → AC-15

### Languages
- [ ] Switch to each of the six languages → every new string on the shelves, sheets, bin and import preview is translated, counts use plural forms → AC-20
- [ ] Arabic → shelves, franchise headings, part headings and the import preview read right to left → AC-20

## Value sourcing checks
- [ ] Item kind everywhere comes from `itemKind` (series decides): give a volume `kind: "comic"` inside a manga series → shelf, menu, reader and export all treat it as manga
- [ ] Reader and export direction come from the kind, not `book.direction`: a manga's PDF has `ViewerPreferences Direction R2L`; its CBZ ComicInfo says `YesAndRightToLeft`
- [ ] New chapter note kind: book → story, comic → comic, manga → manga, audiobook → note
- [ ] New audiobook stored fields: `kind: "audiobook"`, `format: "audio"`, `direction: "ltr"`
- [ ] Series kind falls back: no `kind` → its first item's kind → its `format`
- [ ] Unnumbered item order is `createdAt` ascending, after numbered volumes
- [ ] Add to Franchise list comes from live franchises by title
- [ ] Shelf choice is stored per device in preferences (`booksShelf`), default `all`; an unknown stored value reads as `all`
- [ ] Shown kinds are derived from live items only (a kind whose only items are in the bin is hidden)
- [ ] Switch comic or manga sets direction from the kind (`manga` rtl, `comic` ltr)
- [ ] Franchise heading cover is the first item of the first series in kind order
- [ ] Kind shelf subtitle is `FranchiseEntry.title` through `SeriesEntry.franchiseId`
- [ ] Series count label: `Book`, `Volume`, `Season` go through translations with plurals; a custom label shows as typed ("3 Tomes")
- [ ] Import merge target: equal kind and `seriesMatchKey` ("Pokémon: Adventures!" matches "pokemon adventures"); never a series of another kind
- [ ] Franchise offer comes from the most recently updated matching series that sits in a franchise
- [ ] Delete Series confirm counts are live items and the sum of their own chapters
- [ ] Bin row days left come from `series.trashedAt`; expiry uses the same 7 day retention

## Commands
- [ ] `bun run test` (from the repo root) → passes, including `media-kind`, `arrange-shelf`, `chapter-outline`, `bin-groups`, `import-kinds` and `i18n` tests → AC-1, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-17, AC-20
- [ ] `bun run typecheck && bun run lint` → pass

## Acceptance-criteria coverage
- AC-1 kinds and legacy reads · AC-2 shelf control · AC-3 New menu and audiobook · AC-4 actions per kind · AC-5 comic and manga switching · AC-6 automatic audiobook · AC-7 series decides · AC-8 and AC-9 franchises · AC-10 parts · AC-11 loose chapters · AC-12 kind guess · AC-13 import parts · AC-14 merges · AC-15 franchise offer · AC-16 to AC-19 whole series delete · AC-20 languages · AC-21 adding files
