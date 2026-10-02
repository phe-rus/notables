import { createId } from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";

/** How a book is read: flowing text, full-page images, or listened to. */
export type BookFormat = "prose" | "comic" | "audio";

export interface BookEntry {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  /** Note ids, in reading order. */
  chapterIds: string[];
  createdAt: number;
  updatedAt: number;
  // Added with imports; older books read as prose, left to right, on their own.
  format?: BookFormat;
  /** Manga reads right to left. */
  direction?: "ltr" | "rtl";
  seriesId?: string | null;
  /** Book or season number within its series. */
  volume?: number | null;
  /** `media:<id>` of a cover image. */
  cover?: string | null;
}

export const bookFormat = (book: BookEntry): BookFormat => book.format ?? "prose";

/** Which shelf a book sits on: manga and comics have their own. */
export type BookShelf = "books" | "manga" | "comic";

export function bookShelf(book: BookEntry): BookShelf {
  if (bookFormat(book) !== "comic") return "books";
  return book.direction === "rtl" ? "manga" : "comic";
}

/** "Manga", "Comic" or "Audiobook"; nothing for an ordinary book. */
export function bookKindLabel(book: BookEntry): string | null {
  if (bookFormat(book) === "audio") return "Audiobook";
  const shelf = bookShelf(book);
  return shelf === "manga" ? "Manga" : shelf === "comic" ? "Comic" : null;
}

/**
 * Books live in the library document next to the notes index, so they sync
 * and back up together.
 */
class BookStore {
  readonly books: Y.Map<BookEntry>;
  #snapshot: BookEntry[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.books = doc.getMap<BookEntry>("books");
    this.books.observe(() => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    this.#snapshot = [...this.books.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  create(): BookEntry {
    const now = Date.now();
    const book: BookEntry = {
      id: createId(now),
      title: "",
      subtitle: "",
      author: "",
      chapterIds: [],
      createdAt: now,
      updatedAt: now,
    };
    this.books.set(book.id, book);
    return book;
  }

  update(id: string, patch: Partial<Omit<BookEntry, "id" | "createdAt">>) {
    const current = this.books.get(id);
    if (current) this.books.set(id, { ...current, ...patch, updatedAt: Date.now() });
  }

  addChapter(id: string, noteId: string) {
    const book = this.books.get(id);
    if (book && !book.chapterIds.includes(noteId)) {
      this.update(id, { chapterIds: [...book.chapterIds, noteId] });
    }
  }

  removeChapter(id: string, noteId: string) {
    const book = this.books.get(id);
    if (book) this.update(id, { chapterIds: book.chapterIds.filter((c) => c !== noteId) });
  }

  moveChapter(id: string, from: number, to: number) {
    const book = this.books.get(id);
    if (!book || to < 0 || to >= book.chapterIds.length) return;
    const chapterIds = [...book.chapterIds];
    const [moved] = chapterIds.splice(from, 1);
    if (moved) chapterIds.splice(to, 0, moved);
    this.update(id, { chapterIds });
  }

  /** Drops a deleted note from every book that contains it. */
  forgetNote(noteId: string) {
    for (const book of this.books.values()) {
      if (book.chapterIds.includes(noteId)) this.removeChapter(book.id, noteId);
    }
  }

  remove(id: string) {
    this.books.delete(id);
  }
}

let instance: BookStore | undefined;

export function getBookStore(): BookStore {
  instance ??= new BookStore(getLibrary().doc);
  return instance;
}

const EMPTY: BookEntry[] = [];

export function useBooks(): BookEntry[] {
  const store = getBookStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}

export function useBook(id: string): BookEntry | undefined {
  return useBooks().find((book) => book.id === id);
}
