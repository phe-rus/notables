import type { BookEntry } from "../../books/store/book-store";
import type { SeriesEntry } from "../../books/store/series-store";
import type { LibraryEntry } from "../../library/store/library-store";

/**
 * Deleted notes shown on their own: everything trashed except the
 * chapters of a deleted book, which go and come back with it.
 */
export function binNotes(entries: LibraryEntry[], trashedBooks: BookEntry[]): LibraryEntry[] {
  const deletedBooks = new Set(trashedBooks.map((book) => book.id));
  return entries.filter(
    (entry) => entry.trashedAt && !(entry.bookId && deletedBooks.has(entry.bookId)),
  );
}

/**
 * Series in the bin, and the books shown on their own: a book deleted with
 * its series is folded into the series' row.
 */
export function binSeriesAndBooks(
  trashedBooks: BookEntry[],
  allSeries: SeriesEntry[],
): { series: SeriesEntry[]; books: BookEntry[] } {
  const binned = new Map(
    allSeries.filter((entry) => entry.trashBatch).map((entry) => [entry.id, entry]),
  );
  const folded = (book: BookEntry) => {
    const series = book.seriesId ? binned.get(book.seriesId) : undefined;
    return Boolean(series && book.trashBatch && book.trashBatch === series.trashBatch);
  };
  const withItems = new Set(trashedBooks.filter(folded).map((book) => book.seriesId as string));
  return {
    series: [...binned.values()].filter((entry) => withItems.has(entry.id)),
    books: trashedBooks.filter((book) => !folded(book)),
  };
}
