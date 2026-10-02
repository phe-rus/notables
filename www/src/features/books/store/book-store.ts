import { createId } from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";
import { partsWithout, validParts } from "../lib/chapter-outline";
import { itemKind, kindFields, type MediaKind } from "../model/media-kind";
import type { SeriesEntry } from "./series-store";

/** How a book is read: flowing text, full-page images, or listened to. */
export type BookFormat = "prose" | "comic" | "audio";

export interface BookEntry {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  /** The language the book is written in (BCP 47), when known; read aloud speaks it. */
  language?: string;
  /** Note ids, in reading order. */
  chapterIds: string[];
  createdAt: number;
  updatedAt: number;
  /** Book, comic, manga or audiobook; missing on items saved before kinds. */
  kind?: MediaKind;
  // Written with `kind` so older app versions keep working; read only as its fallback.
  format?: BookFormat;
  /** Manga reads right to left. */
  direction?: "ltr" | "rtl";
  seriesId?: string | null;
  /** Book or season number within its series. */
  volume?: number | null;
  /** `media:<id>` of a cover image. */
  cover?: string | null;
  /** Parts over the chapters, in chapter order; reading order ignores them. */
  parts?: Part[];
  /** What its parts are called here: a known unit ("season", "arc") or a typed word. */
  groupLabel?: string;
  /** What each chapter is called here: "episode", "volume", "track" or a typed word. */
  entryLabel?: string;
  /** When it went to Recently Deleted; cleared on restore. */
  trashedAt?: number | null;
  /** The series delete that took it, while it waits in Recently Deleted with its series. */
  trashBatch?: string | null;
}

/** A run of chapters printed under one title, from `startsAt` to the next part. */
export interface Part {
  id: string;
  title: string;
  /** The chapter the part opens with; must be in `chapterIds`. */
  startsAt: string;
}

/**
 * Books live in the library document next to the notes index, so they sync
 * and back up together.
 */
class BookStore {
  readonly books: Y.Map<BookEntry>;
  readonly #series: Y.Map<SeriesEntry>;
  #snapshot: BookEntry[] = [];
  #trashed: BookEntry[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.books = doc.getMap<BookEntry>("books");
    this.#series = doc.getMap<SeriesEntry>("series");
    this.books.observe(() => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    const all = [...this.books.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    this.#snapshot = all.filter((book) => !book.trashedAt);
    this.#trashed = all.filter((book) => book.trashedAt);
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Books on the shelf; those in Recently Deleted are in `getTrashed`. */
  getSnapshot = () => this.#snapshot;

  getTrashed = () => this.#trashed;

  /** A new, empty item of a kind. */
  create(kind: MediaKind = "book"): BookEntry {
    const now = Date.now();
    const book: BookEntry = {
      id: createId(now),
      title: "",
      subtitle: "",
      author: "",
      chapterIds: [],
      createdAt: now,
      updatedAt: now,
      ...kindFields(kind),
    };
    this.books.set(book.id, book);
    return book;
  }

  /** The kind an item is read as right now, through its series when it has one. */
  kindOf(book: BookEntry): MediaKind {
    const series = book.seriesId ? this.#series.get(book.seriesId) : undefined;
    return itemKind(book, series, [...this.books.values()]);
  }

  /**
   * Every write also stores the item's kind with the `format` and
   * `direction` it implies, so an entry saved before kinds, or left out of
   * step by another device, heals on its next edit. A patch that names a
   * `kind` changes it.
   */
  update(id: string, patch: Partial<Omit<BookEntry, "id" | "createdAt">>) {
    const current = this.books.get(id);
    if (!current) return;
    const next = { ...current, ...patch };
    const kind = patch.kind ?? this.kindOf(next);
    // Markers left pointing at a chapter that is gone are dropped here.
    const parts = next.parts ? { parts: validParts(next) } : {};
    this.books.set(id, { ...next, ...parts, ...kindFields(kind), updatedAt: Date.now() });
  }

  addChapter(id: string, noteId: string) {
    const book = this.books.get(id);
    if (book && !book.chapterIds.includes(noteId)) {
      this.update(id, { chapterIds: [...book.chapterIds, noteId] });
    }
  }

  removeChapter(id: string, noteId: string) {
    const book = this.books.get(id);
    if (!book) return;
    this.update(id, {
      chapterIds: book.chapterIds.filter((c) => c !== noteId),
      ...(book.parts ? { parts: partsWithout(book, noteId) } : {}),
    });
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

const NO_BOOKS: BookEntry[] = [];

/** Books in Recently Deleted. */
export function useTrashedBooks(): BookEntry[] {
  const store = getBookStore();
  return useSyncExternalStore(store.subscribe, store.getTrashed, () => NO_BOOKS);
}
