import { getLibrary } from "../../library/store/library-store";
import { isDrawnKind } from "../model/media-kind";
import { type BookEntry, getBookStore } from "../store/book-store";
import { getSeriesStore } from "../store/series-store";
import { noteKindFor } from "./start-chapter";

/**
 * Turns a comic into manga or back. A standalone item changes alone; an
 * item in a series takes the whole series with it, trashed volumes
 * included, so a series never mixes the two. Chapters change their note
 * kind too. Everything lands in one transaction, so other devices apply
 * it whole.
 */
export function switchComicKind(book: BookEntry, kind: "comic" | "manga"): void {
  const books = getBookStore();
  if (!isDrawnKind(books.kindOf(book))) return;
  const seriesStore = getSeriesStore();
  const series = book.seriesId ? seriesStore.series.get(book.seriesId) : undefined;
  const items = series
    ? [...books.books.values()].filter((item) => item.seriesId === series.id)
    : [book];
  const library = getLibrary();
  library.doc.transact(() => {
    if (series) seriesStore.update(series.id, { kind });
    for (const item of items) {
      books.update(item.id, { kind });
      for (const id of item.chapterIds) {
        const chapter = library.get(id);
        if (chapter?.bookId === item.id && chapter.kind !== noteKindFor(kind)) {
          library.update(id, { kind: noteKindFor(kind) });
        }
      }
    }
  });
}
