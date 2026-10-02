import type { NoteKind } from "@notables/core";
import { $appendContent, composeDocument } from "@notables/editor";
import { writeNote } from "../../library/lib/write-note";
import { kindOfBook } from "../lib/book-kind";
import type { MediaKind } from "../model/media-kind";
import { type BookEntry, getBookStore } from "../store/book-store";

const noteKinds: Record<MediaKind, NoteKind> = {
  book: "story",
  comic: "comic",
  manga: "manga",
  audiobook: "note",
};

/** The note kind a kind's chapters are written as. */
export const noteKindFor = (kind: MediaKind): NoteKind => noteKinds[kind];

/** The kind of note a book's chapters are: stories, comic or manga pages, or recordings. */
export const chapterKind = (book: BookEntry): NoteKind => noteKindFor(kindOfBook(book));

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
