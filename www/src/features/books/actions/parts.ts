import { createId } from "@notables/core";
import { validParts } from "../lib/chapter-outline";
import { getBookStore, type Part } from "../store/book-store";

export const PART_TITLE_MAX = 120;

const cleanTitle = (title: string) => title.trim().slice(0, PART_TITLE_MAX);

/** Starts a part at a chapter; a chapter opens at most one part. */
export function addPart(bookId: string, chapterId: string, title: string): Part | null {
  const store = getBookStore();
  const book = store.books.get(bookId);
  const clean = cleanTitle(title);
  if (!book || !clean || !book.chapterIds.includes(chapterId)) return null;
  const parts = validParts(book);
  if (parts.some((part) => part.startsAt === chapterId)) return null;
  const part: Part = { id: createId(), title: clean, startsAt: chapterId };
  store.update(bookId, { parts: [...parts, part] });
  return part;
}

export function renamePart(bookId: string, partId: string, title: string): void {
  const store = getBookStore();
  const book = store.books.get(bookId);
  const clean = cleanTitle(title);
  if (!book || !clean) return;
  store.update(bookId, {
    parts: validParts(book).map((part) => (part.id === partId ? { ...part, title: clean } : part)),
  });
}

/** Removes a part; its chapters stay where they are. */
export function removePart(bookId: string, partId: string): void {
  const store = getBookStore();
  const book = store.books.get(bookId);
  if (!book) return;
  store.update(bookId, { parts: validParts(book).filter((part) => part.id !== partId) });
}
