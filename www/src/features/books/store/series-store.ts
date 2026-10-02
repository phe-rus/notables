import { createId } from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";
import { formatOf, type MediaKind, seriesKind } from "../model/media-kind";
import type { BookEntry, BookFormat } from "./book-store";

/** Books that belong together: Book 1, 2, 3 of a saga, or the seasons of a show. */
export interface SeriesEntry {
  id: string;
  title: string;
  author: string;
  /** Every item in a series is this kind; missing on series saved before kinds. */
  kind?: MediaKind;
  /** Written with `kind` for older app versions; read only as its fallback. */
  format: BookFormat;
  /** What a part is called: "Book", "Volume" or "Season". */
  partLabel: string;
  createdAt: number;
  updatedAt: number;
}

class SeriesStore {
  readonly series: Y.Map<SeriesEntry>;
  readonly #books: Y.Map<BookEntry>;
  #snapshot: SeriesEntry[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.series = doc.getMap<SeriesEntry>("series");
    this.#books = doc.getMap<BookEntry>("books");
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

  create(
    input: Pick<SeriesEntry, "title" | "author" | "partLabel"> & { kind: MediaKind },
  ): SeriesEntry {
    const now = Date.now();
    const entry: SeriesEntry = {
      id: createId(now),
      ...input,
      format: formatOf(input.kind),
      createdAt: now,
      updatedAt: now,
    };
    this.series.set(entry.id, entry);
    return entry;
  }

  kindOf(series: SeriesEntry): MediaKind {
    return seriesKind(series, [...this.#books.values()]);
  }

  /** Like the book store, every write stores the kind with its `format`. */
  update(id: string, patch: Partial<Omit<SeriesEntry, "id" | "createdAt">>) {
    const current = this.series.get(id);
    if (!current) return;
    const next = { ...current, ...patch };
    const kind = patch.kind ?? this.kindOf(next);
    this.series.set(id, { ...next, kind, format: formatOf(kind), updatedAt: Date.now() });
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
