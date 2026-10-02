import { createId } from "@notables/core";
import {
  validParts,
  withChapterMoved,
  withChaptersInserted,
  withPartMoved,
} from "../lib/chapter-outline";
import { LABEL_MAX } from "../model/structure-labels";
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

/** Moves a chapter to the end of a part, or out of every part with `partId` null. */
export function moveChapterToPart(bookId: string, chapterId: string, partId: string | null) {
  const store = getBookStore();
  const book = store.books.get(bookId);
  if (book) store.update(bookId, withChapterMoved(book, chapterId, partId));
}

/** Moves a part, with its chapters, past its neighbour. */
export function movePart(bookId: string, partId: string, step: 1 | -1) {
  const store = getBookStore();
  const book = store.books.get(bookId);
  if (book) store.update(bookId, withPartMoved(book, partId, step));
}

/**
 * Places chapters just written for this item: at the end of a part, or of
 * the item; `newPart` opens a part at the first of them.
 */
export function placeNewChapters(
  bookId: string,
  added: string[],
  into: { partId: string } | { newPart: string } | null,
) {
  const store = getBookStore();
  const book = store.books.get(bookId);
  const first = added[0];
  if (!book || !first) return;
  const rest = { ...book, chapterIds: book.chapterIds.filter((id) => !added.includes(id)) };
  const chapterIds = withChaptersInserted(
    rest,
    added,
    into && "partId" in into ? into.partId : null,
  );
  const parts =
    into && "newPart" in into && cleanTitle(into.newPart)
      ? [...validParts(rest), { id: createId(), title: cleanTitle(into.newPart), startsAt: first }]
      : validParts(rest);
  store.update(bookId, { chapterIds, parts });
}

/** What this item's groups and entries are called; empty goes back to the kind's words. */
export function setStructure(bookId: string, labels: { group?: string; entry?: string }) {
  const clean = (label?: string) => label?.trim().slice(0, LABEL_MAX) || undefined;
  getBookStore().update(bookId, {
    ...("group" in labels ? { groupLabel: clean(labels.group) } : {}),
    ...("entry" in labels ? { entryLabel: clean(labels.entry) } : {}),
  });
}
