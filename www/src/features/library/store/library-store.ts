import { createId, type NoteKind } from "@notables/core";
import type { Persistence } from "@notables/sync";
import { useSyncExternalStore } from "react";
import * as Y from "yjs";
import { t } from "../../../i18n/i18n";
import { getDeviceId } from "../../../platform/device-identity";
import { getPersistence } from "../../../platform/storage/document-storage";
import type { NoteFont } from "../model/note-fonts";
import type { NotePreviewBlock } from "../model/note-preview";

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  order: number;
}

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
  /**
   * Set on chapters imported as part of a book. They belong to the book and
   * stay out of note lists, but are still found by search.
   */
  bookId?: string | null;
  /** When it went to Recently Deleted; cleared on restore. */
  trashedAt?: number | null;
  /** The note's own font; unset follows the default in Settings. */
  font?: NoteFont;
  folderId?: string | null;
  format?: "document" | "spreadsheet";
  tags?: string[];
  manualTags?: string[];
  previewImage?: string | null;
  previewContent?: NotePreviewBlock[];
  attachmentCount?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * The index of notes on this device. It is itself a Yjs document, so it
 * merges cleanly once it syncs between a person's devices.
 */
export class Library {
  readonly doc = new Y.Doc();
  readonly entries = this.doc.getMap<LibraryEntry>("notes");
  readonly folders = this.doc.getMap<Folder>("folders");
  readonly removedFolders = this.doc.getMap<boolean>("removed-folders");
  ready = false;
  #snapshot: LibraryEntry[] = [];
  #folderSnapshot: Folder[] = [];
  #listeners = new Set<() => void>();

  /** Resolves once the stored library has loaded. */
  readonly loaded: Promise<void>;

  constructor(private readonly persistence: Persistence = getPersistence()) {
    this.entries.observe(() => this.#refresh());
    this.folders.observe(() => this.#refresh(true));
    this.removedFolders.observe(() => this.#refresh(true));
    this.loaded = this.persistence.bind("library", this.doc).then(() => {
      const workspace = this.doc.getMap("workspace");
      if (!workspace.get("foldersVersion")) {
        this.doc.transact(() => {
          const now = Date.now();
          for (const [order, name] of ["writings", "notes", "tasks"].entries()) {
            const id = `default-${name}`;
            if (!this.folders.has(id) && !this.removedFolders.has(id))
              this.folders.set(id, {
                id,
                name: t(`workspace.${name as "writings" | "notes" | "tasks"}`),
                createdAt: now,
                order,
              });
          }
          for (const entry of this.entries.values()) {
            if (!entry.folderId && !entry.bookId)
              this.entries.set(entry.id, { ...entry, folderId: "default-writings" });
          }
          workspace.set("foldersVersion", 1);
        });
      }
      this.ready = true;
      this.#refresh(true);
    });
  }

  #refresh(foldersChanged = false) {
    if (foldersChanged)
      this.#folderSnapshot = [...this.folders.values()]
        .filter((folder) => !this.removedFolders.has(folder.id))
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
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
  getFolders = () => this.#folderSnapshot;

  createFolder(name: string): Folder {
    const title = name.trim().slice(0, 120);
    if (!title) throw new Error("A folder needs a name");
    const now = Date.now();
    const folder = {
      id: createId(now),
      name: title,
      createdAt: now,
      order: Math.max(-1, ...[...this.folders.values()].map((item) => item.order)) + 1,
    };
    this.folders.set(folder.id, folder);
    return folder;
  }

  renameFolder(id: string, name: string) {
    const folder = this.folders.get(id);
    const title = name.trim().slice(0, 120);
    if (folder && title && !this.removedFolders.has(id))
      this.folders.set(id, { ...folder, name: title });
  }

  moveFolder(id: string, direction: -1 | 1) {
    const folders = this.getFolders();
    const index = folders.findIndex((folder) => folder.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= folders.length) return;
    const ordered = [...folders];
    const [folder] = ordered.splice(index, 1);
    if (!folder) return;
    ordered.splice(destination, 0, folder);
    this.doc.transact(() =>
      ordered.forEach((item, order) => {
        if (item.order !== order) this.folders.set(item.id, { ...item, order });
      }),
    );
  }

  removeFolder(id: string) {
    const destination = this.getFolders().find((folder) => folder.id !== id)?.id ?? null;
    this.doc.transact(() => {
      for (const entry of this.entries.values()) {
        if (entry.folderId === id) this.entries.set(entry.id, { ...entry, folderId: destination });
      }
      this.removedFolders.set(id, true);
      this.folders.delete(id);
    });
  }

  moveToFolder(ids: readonly string[], folderId: string | null) {
    if (folderId !== null && !this.getFolders().some((folder) => folder.id === folderId)) return;
    this.doc.transact(() => {
      for (const id of ids) this.update(id, { folderId });
    });
  }

  get(id: string): LibraryEntry | undefined {
    return this.entries.get(id);
  }

  create(kind: NoteKind = "note", folderId?: string | null): LibraryEntry {
    const now = Date.now();
    const entry: LibraryEntry = {
      id: createId(now),
      kind,
      folderId:
        folderId === undefined
          ? this.getFolders().some((folder) => folder.id === "default-writings")
            ? "default-writings"
            : (this.getFolders()[0]?.id ?? null)
          : folderId,
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

  /**
   * Adds a note that started on another device, such as one shared with
   * this person, keeping its id and origin so this device never seeds it.
   */
  receive(input: { id: string; kind: NoteKind; title: string; origin: string }): LibraryEntry {
    const existing = this.entries.get(input.id);
    if (existing) return existing;
    const now = Date.now();
    const entry: LibraryEntry = {
      ...input,
      excerpt: "",
      pinned: false,
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
    if (!current) return;
    const unchanged = Object.entries(patch).every(([key, value]) => {
      const before = current[key as keyof LibraryEntry];
      if (key === "previewContent") return JSON.stringify(before) === JSON.stringify(value);
      return (
        Object.is(before, value) ||
        (Array.isArray(before) &&
          Array.isArray(value) &&
          before.length === value.length &&
          before.every((item, index) => item === value[index]))
      );
    });
    if (!unchanged) this.entries.set(id, { ...current, ...patch });
  }

  async remove(id: string) {
    this.entries.delete(id);
    await this.persistence.remove(`note:${id}`);
  }
}

let instance: Library | undefined;

/** Browser-only singleton; the app shell renders on the client (local-first). */
export function getLibrary(): Library {
  instance ??= new Library();
  return instance;
}

const EMPTY: LibraryEntry[] = [];
const NO_FOLDERS: Folder[] = [];

export function useFolders(): Folder[] {
  const library = getLibrary();
  return useSyncExternalStore(library.subscribe, library.getFolders, () => NO_FOLDERS);
}

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
  const library = getLibrary();
  return useSyncExternalStore(
    library.subscribe,
    () => library.get(id),
    () => undefined,
  );
}

/**
 * Notes that appear in note lists: not chapters that came in with an
 * imported book, and not in Recently Deleted.
 */
export const isListedNote = (entry: LibraryEntry) => !entry.bookId && !entry.trashedAt;
