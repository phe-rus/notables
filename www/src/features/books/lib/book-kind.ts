import { useMemo } from "react";
import type { MediaKind } from "../model/media-kind";
import { type BookEntry, getBookStore, useBooks } from "../store/book-store";
import { getSeriesStore, type SeriesEntry, useSeries } from "../store/series-store";

/** An item's kind as shown and read, through its series when it has one. */
export const kindOfBook = (book: BookEntry): MediaKind => getBookStore().kindOf(book);

/** A series' kind, which every item in it shares. */
export const kindOfSeries = (series: SeriesEntry): MediaKind => getSeriesStore().kindOf(series);

/** The same, kept current as the item or its series change. */
export function useBookKind(book: BookEntry): MediaKind {
  const books = useBooks();
  const series = useSeries();
  return useMemo(() => kindOfBook(book), [book, books, series]);
}
