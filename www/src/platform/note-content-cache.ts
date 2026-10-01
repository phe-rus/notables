import type { DocumentSnapshot } from "@notables/editor";

/**
 * The latest serialized document of each note, kept on the device so books
 * and previews can render notes without opening their editors.
 */
type SerializedDocument = DocumentSnapshot["document"];

const DB_NAME = "notables:note-content";
const STORE = "documents";

let database: Promise<IDBDatabase> | undefined;

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

export function saveNoteContent(noteId: string, document: SerializedDocument): Promise<unknown> {
  return run("readwrite", (store) => store.put(document, noteId));
}

export function loadNoteContent(noteId: string): Promise<SerializedDocument | undefined> {
  return run("readonly", (store) => store.get(noteId));
}

export function deleteNoteContent(noteId: string): Promise<unknown> {
  return run("readwrite", (store) => store.delete(noteId));
}
