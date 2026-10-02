import type { NoteKind } from "@notables/core";
import { $appendContent, composeDocument } from "@notables/editor";
import { writeNote } from "../../library/lib/write-note";
import { type BookEntry, bookShelf, getBookStore } from "../store/book-store";

/** The kind of note a book's chapters are: stories, or manga or comic pages. */
export function chapterKind(book: BookEntry): NoteKind {
  const shelf = bookShelf(book);
  return shelf === "books" ? "story" : shelf;
}

/**
 * Starts a new chapter at the end of a book, titled with its number, and
 * returns its note id. The chapter belongs to the book: it lives there
 * rather than in the notes lists.
 */
export async function startChapter(book: BookEntry): Promise<string> {
  const title = `Chapter ${book.chapterIds.length + 1}`;
  const note = await writeNote({
    kind: chapterKind(book),
    bookId: book.id,
    compose: (doc) => composeDocument(doc, () => $appendContent({ title })),
  });
  getBookStore().addChapter(book.id, note.id);
  return note.id;
}
