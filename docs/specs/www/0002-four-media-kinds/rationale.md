# 0002. Four media kinds: rationale

## Context

Notables already holds books, comics, manga and audiobooks, but no item stores what it is. `BookEntry` has a `format` (`prose`, `comic`, `audio`) and a `direction` (`rtl` for manga), and helpers (`bookFormat`, `bookShelf`, `bookKindLabel`) work the kind out from those two fields wherever it is needed. Manga is a comic that happens to read right to left. The scope calls this "formats bolted onto one book type", and it shows: the New menu has no audiobook, menus offer the same actions everywhere, and imports ask once whether everything picked is comic or manga.

The structure is Series, then item (a volume, with a `volume` number), then chapter notes in `chapterIds`. A series has a `format` too, so it is already one kind in practice. Nothing groups series that belong to one world in different media, and nothing groups chapters inside an item, although EPUB contents and audiobook folders often carry exactly that grouping.

Deleting is item by item. `eraseBook` removes a series as a side effect once its last item is gone, and Recently Deleted only knows notes and items. Deleting a 40 volume manga means selecting 40 rows, and restoring it means finding them again.

All of this lives in the library Yjs document, synced between a person's devices that may run different app versions. Any change to how entries are written has to keep older versions reading correctly, and must not make every device rewrite every entry when it opens, because those rewrites race each other through sync.

## Options considered

### Option 1: Explicit kind and new levels on the existing stores

Add an optional `kind` to items and series, read through a fallback from `format` and `direction`, written alongside them. Add a `franchises` map, `franchiseId` on series, part markers (`{ id, title, startsAt }`) on items, and a shared `trashedAt` stamp on a series and its items for whole series deletes.

**Pros**:
- No data migration; older entries and older app versions keep working.
- Readers, exporters and the audiobook session keep the flat `chapterIds` they already use.
- The bin, retention and `eraseBook` are reused as they are.

**Cons**:
- Kind is stored twice (as `kind` and as `format` plus `direction`) until older versions are retired.
- Part markers need maintenance rules when chapters move or disappear.

### Option 2: A new normalized media model

Replace `BookEntry` and `SeriesEntry` with new entities (Work, Series, Volume, Part, Chapter), each in its own map, with parts owning chapter lists, and migrate the library once.

**Pros**:
- The cleanest model on paper: every level is a first class entity.
- No legacy fields left over.

**Cons**:
- A one time migration on every device of a synced Yjs document, where two devices migrating at once write conflicting entries.
- Every reader, exporter, the audiobook session, highlights, the bin and the welcome examples change at once: a big bang rewrite of working features.
- Older app versions on other devices see an empty shelf.

### Option 3: Keep deriving the kind, franchise as a tag

Formalize the existing derivation (no `kind` field), add a `franchise` text tag to series, and leave parts out.

**Pros**:
- Smallest change.

**Cons**:
- Comic versus manga stays implied by reading direction, so a kind and a reading setting can never differ, and every caller keeps working it out.
- A tag cannot be renamed in one place or removed as a unit, and does not satisfy the confirmed requirement for franchises as a level.
- Leaves out parts, which the scope topic asks for.

## Rationale

Option 1 fixes the root problem (the kind is never stored) in place, which the enhancement guidance favours when the existing structure is sound. Here it is: series, items and chapter notes already map well onto series, volumes and chapters. The two missing levels are additive. A franchise sits above series without changing them, and parts sit over the chapter order without changing it.

The deciding force is sync between devices on different versions. Option 2 needs a migration that every device runs on its own copy of a shared Yjs document, the textbook case for conflicting writes. It also rewrites readers and exporters that work today. Option 1 needs no migration: fallbacks read old data, and writing `format` and `direction` alongside `kind` keeps older versions correct. That costs a temporary duplicate field, which is cheap and has a clear removal step.

Smaller calls made while writing this spec:
- **Part markers over nested lists**: the flat `chapterIds` feed the reader, page counts, the audiobook session, highlights and every exporter. Markers leave all of them alone; nested lists would touch each. Runner up: nested `parts[].chapterIds`.
- **A batch id for series deletes**: a `trashBatch` uuid on the series and on the items it took tells "deleted with the series" apart from "deleted earlier on its own" with no new store, and stays exact under sync where timestamps could collide or drift. `trashedAt` still drives retention as today. Runner up: matching on equal `trashedAt` values (what the first draft chose; the cross check showed the id is safer for one extra field), or a separate trash record listing ids.
- **Accept whole entry writes**: stores set the whole object per key, so concurrent edits of one entry keep the last. That limit already applies to `chapterIds`; restructuring every entry into nested Y.Maps is a larger change than this feature. Multi entry changes run in one transaction instead. Runner up: nested Y.Maps per entry.
- **Old fields win on disagreement**: when `format` or `direction` disagree with `kind`, only an older app version can have caused it, so they are trusted. Runner up: `kind` always wins, which would silently ignore edits made on older devices.
- **No hint means Manga on import**: it matches today's default toggle, so imports behave as before when files carry no hint. Runner up: Comic.
- **Title match key** (lowercase, accents removed, punctuation removed, spaces collapsed): catches "One Piece" against "one_piece" and "One-Piece" without fuzzy matching, which would merge different works. Runner up: exact title match, which misses most real duplicates.
- **Franchise offer ticked by default**: the person sees it in the preview before anything is written, which meets "never created silently" while saving a tap in the common case. Runner up: unticked.
- **Franchise ordering by kind, then title**: stable and predictable on every device. Runner up: most recently read.
- **Keep the stored `partLabel` strings** and translate the known ones at display time, instead of changing the stored type, so no migration is needed. Runner up: store a token.
