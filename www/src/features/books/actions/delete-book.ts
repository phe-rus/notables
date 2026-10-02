import { localMediaId } from "@notables/core";
import { confirmDialog, toast } from "@notables/ui";
import { deleteMedia } from "../../../platform/storage/media-store";
import { getLibrary } from "../../library/store/library-store";
import { deleteNote } from "../../notes/actions/delete-note";
import { type BookEntry, getBookStore } from "../store/book-store";
import { getSeriesStore } from "../store/series-store";

/** Chapters that exist only inside this book, such as imported ones. */
const ownChapters = (book: BookEntry) =>
  book.chapterIds.filter((id) => getLibrary().get(id)?.bookId === book.id);

/**
 * Asks, then deletes a book. Chapters gathered from notes stay in the
 * notes; chapters that came with the book (imports) go with it, along with
 * their pages, recordings and the cover. Returns whether it was deleted.
 */
export async function deleteBook(book: BookEntry): Promise<boolean> {
  const owned = ownChapters(book);
  const confirmed = await confirmDialog({
    title: "Delete this book?",
    message:
      owned.length === 0
        ? "Its chapters stay in your notes."
        : owned.length === book.chapterIds.length
          ? "Its chapters, pages and recordings are deleted from this device too."
          : "Chapters that came with it are deleted too; the rest stay in your notes.",
    confirmLabel: "Delete",
    destructive: true,
  });
  if (!confirmed) return false;

  getBookStore().remove(book.id);
  const coverId = book.cover ? localMediaId(book.cover) : null;
  await Promise.all([
    ...owned.map((id) => deleteNote(id).catch(() => {})),
    coverId ? deleteMedia(coverId).catch(() => {}) : null,
  ]);
  if (book.seriesId) {
    const left = getBookStore()
      .getSnapshot()
      .some((other) => other.seriesId === book.seriesId);
    if (!left) getSeriesStore().remove(book.seriesId);
  }
  toast("Book deleted", { description: book.title || undefined });
  return true;
}
