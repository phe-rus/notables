import { createId } from "@notables/core";
import { useMemo, useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../../library/store/library-store";
import type { TextQuote } from "../lib/text-quote";

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** A passage marked while reading, anchored by its words in a chapter. */
export interface HighlightEntry {
  id: string;
  bookId: string;
  /** The chapter's note. */
  noteId: string;
  quote: TextQuote;
  color: HighlightColor;
  createdAt: number;
}

class HighlightStore {
  readonly highlights: Y.Map<HighlightEntry>;
  #snapshot: HighlightEntry[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.highlights = doc.getMap<HighlightEntry>("highlights");
    this.highlights.observe(() => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    this.#snapshot = [...this.highlights.values()].sort((a, b) => a.createdAt - b.createdAt);
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  add(input: Omit<HighlightEntry, "id" | "createdAt">): HighlightEntry {
    const now = Date.now();
    const entry: HighlightEntry = { id: createId(now), ...input, createdAt: now };
    this.highlights.set(entry.id, entry);
    return entry;
  }

  recolor(id: string, color: HighlightColor) {
    const current = this.highlights.get(id);
    if (current) this.highlights.set(id, { ...current, color });
  }

  remove(id: string) {
    this.highlights.delete(id);
  }

  /** Forgets every highlight in a book, when the book is deleted. */
  removeBook(bookId: string) {
    for (const entry of this.#snapshot)
      if (entry.bookId === bookId) this.highlights.delete(entry.id);
  }
}

let instance: HighlightStore | undefined;

export function getHighlightStore(): HighlightStore {
  instance ??= new HighlightStore(getLibrary().doc);
  return instance;
}

const EMPTY: HighlightEntry[] = [];

export function useHighlights(bookId: string): HighlightEntry[] {
  const store = getHighlightStore();
  const all = useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
  return useMemo(() => all.filter((entry) => entry.bookId === bookId), [all, bookId]);
}
