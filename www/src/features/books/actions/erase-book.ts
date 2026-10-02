import { localMediaId } from "@notables/core";
import { deleteMedia } from "../../../platform/storage/media-store";
import { getLibrary } from "../../library/store/library-store";
import { deleteNote } from "../../notes/actions/delete-note";
import { getHighlightStore } from "../highlights/store/highlight-store";
import { type BookEntry, getBookStore } from "../store/book-store";
import { getSeriesStore } from "../store/series-store";

/** Chapters that exist only inside this book, such as imported or new ones. */
export const ownChapters = (book: BookEntry) =>
  book.chapterIds.filter((id) => getLibrary().get(id)?.bookId === book.id);

/**
 * Deletes a book for good. Chapters gathered from notes stay in the notes;
 * chapters that belong to the book go with it, with their pages,
 * recordings, highlights and the cover. A series left empty goes too.
 */
export async function eraseBook(book: BookEntry): Promise<void> {
  const owned = ownChapters(book);
  getBookStore().remove(book.id);
  getHighlightStore().removeBook(book.id);
  const coverId = book.cover ? localMediaId(book.cover) : null;
  await Promise.all([
    ...owned.map((id) => deleteNote(id).catch(() => {})),
    coverId ? deleteMedia(coverId).catch(() => {}) : null,
  ]);
  if (book.seriesId) {
    const store = getBookStore();
    const left = [...store.getSnapshot(), ...store.getTrashed()].some(
      (other) => other.seriesId === book.seriesId,
    );
    if (!left) getSeriesStore().remove(book.seriesId);
  }
}
