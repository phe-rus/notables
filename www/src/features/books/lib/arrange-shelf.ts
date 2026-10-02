import type { BookEntry } from "../store/book-store";
import type { SeriesEntry } from "../store/series-store";

export type ShelfItem =
  | { type: "book"; book: BookEntry }
  | { type: "series"; series: SeriesEntry; books: BookEntry[] };

const byVolume = (a: BookEntry, b: BookEntry) =>
  (a.volume ?? Number.MAX_SAFE_INTEGER) - (b.volume ?? Number.MAX_SAFE_INTEGER);

/**
 * Lays books out for a shelf: the volumes of a series sit together, in
 * order, where the series' most recent book would be. A series with one
 * book here is just that book.
 */
export function arrangeShelf(books: BookEntry[], series: SeriesEntry[]): ShelfItem[] {
  const seriesById = new Map(series.map((entry) => [entry.id, entry]));
  const members = new Map<string, BookEntry[]>();
  for (const book of books) {
    if (!book.seriesId || !seriesById.has(book.seriesId)) continue;
    members.set(book.seriesId, [...(members.get(book.seriesId) ?? []), book]);
  }

  const items: ShelfItem[] = [];
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
  return items;
}

/** A volume's title inside its series: "Volume 2" rather than "Tidewater Volume 2". */
export function titleInSeries(book: BookEntry, series: SeriesEntry): string {
  const prefix = `${series.title} `;
  return book.title.startsWith(prefix) ? book.title.slice(prefix.length) : book.title;
}
