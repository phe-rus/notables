import { toast } from "@notables/ui";
import { eraseBook, ownChapters } from "../../books/actions/erase-book";
import { type BookEntry, getBookStore } from "../../books/store/book-store";
import { getLibrary, type LibraryEntry } from "../../library/store/library-store";
import { deleteNote } from "../../notes/actions/delete-note";

import { isExpired, RETENTION_DAYS } from "./retention";

/*
 * Recently Deleted: notes and books wait here, restorable, for a week
 * before they're erased for good.
 */

const plural = (count: number, one: string, many: string) =>
  count === 1 ? `1 ${one}` : `${count} ${many}`;

function setNotesTrashed(ids: string[], trashedAt: number | null) {
  const library = getLibrary();
  for (const id of ids) library.update(id, { trashedAt });
}

function setBooksTrashed(books: BookEntry[], trashedAt: number | null) {
  const store = getBookStore();
  for (const book of books) {
    store.update(book.id, { trashedAt });
    // A book's own chapters go and come back with it.
    setNotesTrashed(ownChapters(book), trashedAt);
  }
}

export function moveNotesToBin(entries: LibraryEntry[]) {
  if (entries.length === 0) return;
  const ids = entries.map((entry) => entry.id);
  setNotesTrashed(ids, Date.now());
  toast(entries.length === 1 ? "Moved to Recently Deleted" : `${entries.length} notes deleted`, {
    description:
      entries.length === 1
        ? entries[0]?.title || undefined
        : `Restore them from Recently Deleted within ${RETENTION_DAYS} days.`,
    action: { label: "Undo", onClick: () => setNotesTrashed(ids, null) },
  });
}

export function moveBooksToBin(books: BookEntry[]) {
  if (books.length === 0) return;
  setBooksTrashed(books, Date.now());
  toast(books.length === 1 ? "Moved to Recently Deleted" : `${books.length} books deleted`, {
    description:
      books.length === 1
        ? books[0]?.title || undefined
        : `Restore them from Recently Deleted within ${RETENTION_DAYS} days.`,
    action: { label: "Undo", onClick: () => setBooksTrashed(books, null) },
  });
}

export function restoreNote(entry: LibraryEntry) {
  setNotesTrashed([entry.id], null);
  toast.success("Restored", { description: entry.title || undefined });
}

export function restoreBook(book: BookEntry) {
  setBooksTrashed([book], null);
  toast.success("Restored", { description: book.title || undefined });
}

/** What's in the bin: notes on their own (a book's chapters travel with it), and books. */
export function binContents() {
  return {
    notes: getLibrary()
      .getSnapshot()
      .filter((entry) => entry.trashedAt && !entry.bookId),
    books: getBookStore().getTrashed(),
  };
}

export async function eraseNotes(entries: LibraryEntry[]) {
  await Promise.all(entries.map((entry) => deleteNote(entry.id).catch(() => {})));
}

export async function eraseBooks(books: BookEntry[]) {
  for (const book of books) await eraseBook(book).catch(() => {});
}

export async function emptyBin() {
  const { notes, books } = binContents();
  await eraseBooks(books);
  await eraseNotes(notes);
  toast(`${plural(notes.length + books.length, "item", "items")} erased`);
}

/** Erases whatever has been in the bin longer than the retention period. */
export async function eraseExpired(now = Date.now()) {
  const { notes, books } = binContents();
  await eraseBooks(books.filter((book) => book.trashedAt && isExpired(book.trashedAt, now)));
  await eraseNotes(notes.filter((entry) => entry.trashedAt && isExpired(entry.trashedAt, now)));
}
