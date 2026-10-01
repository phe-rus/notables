import { createId, type NoteKind } from "@notables/core";
import { useSyncExternalStore } from "react";
import * as Y from "yjs";
import { getDeviceId } from "../../../platform/device-identity";
import { getPersistence } from "../../../platform/note-storage";

export interface LibraryEntry {
  id: string;
  kind: NoteKind;
  title: string;
  excerpt: string;
  pinned: boolean;
  /** Device that created the note; only it seeds the empty document. */
  origin: string;
  /** Set while the note is published. */
  publicationId: string | null;
  /** Secret that lets this device update or unpublish the publication. */
  publishKey: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * The index of notes on this device. It is itself a Yjs document, so it
 * merges cleanly once it syncs between a person's devices.
 */
class Library {
  readonly doc = new Y.Doc();
  readonly entries = this.doc.getMap<LibraryEntry>("notes");
  ready = false;
  #snapshot: LibraryEntry[] = [];
  #listeners = new Set<() => void>();

  constructor() {
    this.entries.observe(() => this.#refresh());
    void getPersistence()
      .bind("library", this.doc)
      .then(() => {
        this.ready = true;
        this.#refresh();
      });
  }

  #refresh() {
    this.#snapshot = [...this.entries.values()].sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
    );
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  get(id: string): LibraryEntry | undefined {
    return this.entries.get(id);
  }

  create(kind: NoteKind = "note"): LibraryEntry {
    const now = Date.now();
    const entry: LibraryEntry = {
      id: createId(now),
      kind,
      title: "",
      excerpt: "",
      pinned: false,
      origin: getDeviceId(),
      publicationId: null,
      publishKey: null,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  update(id: string, patch: Partial<Omit<LibraryEntry, "id" | "origin" | "createdAt">>) {
    const current = this.entries.get(id);
    if (current) this.entries.set(id, { ...current, ...patch });
  }

  async remove(id: string) {
    this.entries.delete(id);
    await getPersistence().remove(`note:${id}`);
  }
}

let instance: Library | undefined;

/** Browser-only singleton; the app shell renders on the client (local-first). */
export function getLibrary(): Library {
  instance ??= new Library();
  return instance;
}

const EMPTY: LibraryEntry[] = [];

export function useLibrary(): LibraryEntry[] {
  const library = getLibrary();
  return useSyncExternalStore(library.subscribe, library.getSnapshot, () => EMPTY);
}

export function useLibraryReady(): boolean {
  const library = getLibrary();
  return useSyncExternalStore(
    library.subscribe,
    () => library.ready,
    () => false,
  );
}

export function useEntry(id: string): LibraryEntry | undefined {
  return useLibrary().find((entry) => entry.id === id);
}
