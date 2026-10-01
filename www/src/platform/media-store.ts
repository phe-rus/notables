import { createId } from "@notables/core";

/**
 * Recordings and photos stored on this device (IndexedDB). Documents refer
 * to them as `media:<id>`; the native Rust core will take over storage
 * behind the same functions.
 */
const DB_NAME = "notables:media";
const STORE = "files";

interface StoredMedia {
  blob: Blob;
  createdAt: number;
}

let database: Promise<IDBDatabase> | undefined;
const objectUrls = new Map<string, string>();

function open(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const request = work(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Stores a file and returns its media id. */
export async function saveMedia(blob: Blob): Promise<string> {
  const id = createId();
  await run("readwrite", (store) =>
    store.put({ blob, createdAt: Date.now() } satisfies StoredMedia, id),
  );
  return id;
}

export async function loadMedia(id: string): Promise<Blob | null> {
  const stored = await run<StoredMedia | undefined>("readonly", (store) => store.get(id));
  return stored?.blob ?? null;
}

export async function deleteMedia(id: string): Promise<void> {
  const url = objectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(id);
  await run("readwrite", (store) => store.delete(id));
}

/** A playable URL for a stored file, cached for the session. */
export async function resolveMediaUrl(id: string): Promise<string | null> {
  const cached = objectUrls.get(id);
  if (cached) return cached;
  const blob = await loadMedia(id).catch(() => null);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, url);
  return url;
}
