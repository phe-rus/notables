import { createId } from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";
import type { BookFormat } from "./book-store";

/** Books that belong together: Book 1, 2, 3 of a saga, or the seasons of a show. */
export interface SeriesEntry {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  /** What a part is called: "Book", "Volume" or "Season". */
  partLabel: string;
  createdAt: number;
  updatedAt: number;
}

class SeriesStore {
  readonly series: Y.Map<SeriesEntry>;
  #snapshot: SeriesEntry[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.series = doc.getMap<SeriesEntry>("series");
    this.series.observe(() => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    this.#snapshot = [...this.series.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  create(input: Pick<SeriesEntry, "title" | "author" | "format" | "partLabel">): SeriesEntry {
    const now = Date.now();
    const entry: SeriesEntry = { id: createId(now), ...input, createdAt: now, updatedAt: now };
    this.series.set(entry.id, entry);
    return entry;
  }

  update(id: string, patch: Partial<Omit<SeriesEntry, "id" | "createdAt">>) {
    const current = this.series.get(id);
    if (current) this.series.set(id, { ...current, ...patch, updatedAt: Date.now() });
  }

  remove(id: string) {
    this.series.delete(id);
  }
}

let instance: SeriesStore | undefined;

export function getSeriesStore(): SeriesStore {
  instance ??= new SeriesStore(getLibrary().doc);
  return instance;
}

const EMPTY: SeriesEntry[] = [];

export function useSeries(): SeriesEntry[] {
  const store = getSeriesStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}
