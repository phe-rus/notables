import { type MediaKind, mediaKinds } from "../model/media-kind";
import type { BookEntry } from "../store/book-store";
import type { FranchiseEntry } from "../store/franchise-store";
import type { SeriesEntry } from "../store/series-store";

export type SeriesOrBook =
  | { type: "book"; book: BookEntry }
  | { type: "series"; series: SeriesEntry; books: BookEntry[] };

export type ShelfItem =
  | SeriesOrBook
  | { type: "franchise"; franchise: FranchiseEntry; items: SeriesOrBook[] };

export interface ShelfOptions {
  /** Given on the All shelf: series in a franchise sit together under its heading. */
  franchises?: FranchiseEntry[];
  kindOf?: (book: BookEntry) => MediaKind;
}

/** Numbered volumes in order, then unnumbered ones (loose chapters), oldest first. */
const byVolume = (a: BookEntry, b: BookEntry) =>
  (a.volume ?? Number.MAX_SAFE_INTEGER) - (b.volume ?? Number.MAX_SAFE_INTEGER) ||
  (a.volume == null && b.volume == null ? a.createdAt - b.createdAt : 0);

/**
 * Lays books out for a shelf: the volumes of a series sit together, in
 * order, where the series' most recent book would be. A series with one
 * book here is just that book.
 */
export function arrangeShelf(
  books: BookEntry[],
  series: SeriesEntry[],
  options: ShelfOptions = {},
): ShelfItem[] {
  const seriesById = new Map(series.map((entry) => [entry.id, entry]));
  const members = new Map<string, BookEntry[]>();
  for (const book of books) {
    if (!book.seriesId || !seriesById.has(book.seriesId)) continue;
    members.set(book.seriesId, [...(members.get(book.seriesId) ?? []), book]);
  }

  const items: SeriesOrBook[] = [];
  const placed = new Set<string>();
  for (const book of books) {
    const group = book.seriesId ? members.get(book.seriesId) : undefined;
    const entry = book.seriesId ? seriesById.get(book.seriesId) : undefined;
    if (!group || !entry || group.length < 2) {
      items.push({ type: "book", book });
      continue;
    }
    if (placed.has(entry.id)) continue;
    placed.add(entry.id);
    items.push({ type: "series", series: entry, books: [...group].sort(byVolume) });
  }
  return options.franchises ? groupFranchises(items, seriesById, options) : items;
}

/**
 * Gathers the series of each franchise under it, where its most recent
 * series would be, ordered books, comics, manga, audiobooks, then by title.
 * A franchise with nothing live never shows.
 */
function groupFranchises(
  items: SeriesOrBook[],
  seriesById: Map<string, SeriesEntry>,
  { franchises = [], kindOf }: ShelfOptions,
): ShelfItem[] {
  const franchiseById = new Map(franchises.map((entry) => [entry.id, entry]));
  const seriesOf = (item: SeriesOrBook) =>
    item.type === "series"
      ? item.series
      : item.book.seriesId
        ? seriesById.get(item.book.seriesId)
        : undefined;
  const result: ShelfItem[] = [];
  const groups = new Map<string, Extract<ShelfItem, { type: "franchise" }>>();
  for (const item of items) {
    const franchiseId = seriesOf(item)?.franchiseId;
    const franchise = franchiseId ? franchiseById.get(franchiseId) : undefined;
    if (!franchise) {
      result.push(item);
      continue;
    }
    let group = groups.get(franchise.id);
    if (!group) {
      group = { type: "franchise", franchise, items: [] };
      groups.set(franchise.id, group);
      result.push(group);
    }
    group.items.push(item);
  }
  const first = (item: SeriesOrBook) => (item.type === "series" ? item.books[0] : item.book);
  const rank = (item: SeriesOrBook) => {
    const book = first(item);
    return book && kindOf ? mediaKinds.indexOf(kindOf(book)) : 0;
  };
  const title = (item: SeriesOrBook) => seriesOf(item)?.title ?? first(item)?.title ?? "";
  for (const group of groups.values()) {
    group.items.sort((a, b) => rank(a) - rank(b) || title(a).localeCompare(title(b)));
  }
  return result;
}

/** A volume's title inside its series: "Volume 2" rather than "Tidewater Volume 2". */
export function titleInSeries(book: BookEntry, series: SeriesEntry): string {
  const prefix = `${series.title} `;
  return book.title.startsWith(prefix) ? book.title.slice(prefix.length) : book.title;
}

/** Every book on a shelf, in shelf order. */
export function shelfBooks(items: ShelfItem[]): BookEntry[] {
  return items.flatMap((item) =>
    item.type === "book"
      ? [item.book]
      : item.type === "series"
        ? item.books
        : shelfBooks(item.items),
  );
}
