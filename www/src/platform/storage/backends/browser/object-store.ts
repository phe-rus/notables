/** A single IndexedDB object store with promise-based requests. */
export interface ObjectStore {
  request<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T>;
}

export function openObjectStore(databaseName: string, storeName: string): ObjectStore {
  let database: Promise<IDBDatabase> | undefined;

  const open = () => {
    database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return database;
  };

  return {
    async request(mode, work) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = work(db.transaction(storeName, mode).objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
  };
}
