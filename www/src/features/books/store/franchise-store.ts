import { createId } from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";
import type { SeriesEntry } from "./series-store";

/** Series of any kinds from one world: the One Piece manga, novels and audiobooks. */
export interface FranchiseEntry {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export const FRANCHISE_TITLE_MAX = 120;

const cleanTitle = (title: string) => title.trim().slice(0, FRANCHISE_TITLE_MAX);

class FranchiseStore {
  readonly franchises: Y.Map<FranchiseEntry>;
  readonly #doc: Y.Doc;
  #snapshot: FranchiseEntry[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.#doc = doc;
    this.franchises = doc.getMap<FranchiseEntry>("franchises");
    this.franchises.observe(() => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    this.#snapshot = [...this.franchises.values()].sort((a, b) => a.title.localeCompare(b.title));
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  create(title: string): FranchiseEntry {
    const now = Date.now();
    const entry: FranchiseEntry = {
      id: createId(now),
      title: cleanTitle(title),
      createdAt: now,
      updatedAt: now,
    };
    this.franchises.set(entry.id, entry);
    return entry;
  }

  rename(id: string, title: string) {
    const current = this.franchises.get(id);
    const clean = cleanTitle(title);
    if (current && clean)
      this.franchises.set(id, { ...current, title: clean, updatedAt: Date.now() });
  }

  /** Ungroups a franchise: every series stays, only the grouping goes. */
  remove(id: string) {
    const series = this.#doc.getMap<SeriesEntry>("series");
    this.#doc.transact(() => {
      for (const entry of series.values()) {
        if (entry.franchiseId === id) series.set(entry.id, { ...entry, franchiseId: null });
      }
      this.franchises.delete(id);
    });
  }
}

let instance: FranchiseStore | undefined;

export function getFranchiseStore(): FranchiseStore {
  instance ??= new FranchiseStore(getLibrary().doc);
  return instance;
}

const EMPTY: FranchiseEntry[] = [];

export function useFranchises(): FranchiseEntry[] {
  const store = getFranchiseStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}
