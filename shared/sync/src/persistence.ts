import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

/**
 * On-device storage for Yjs documents. The web and the Tauri WebView use
 * IndexedDB today; the Rust core will provide SQLite storage behind the
 * same contract.
 */
export interface Persistence {
  /** Applies the stored state to `doc`, then keeps storing its updates. */
  bind(name: string, doc: Y.Doc): Promise<{ destroy(): void }>;
  /** Permanently removes a document's local state. */
  remove(name: string): Promise<void>;
}

export function createIndexedDbPersistence(prefix = "notables"): Persistence {
  const dbName = (name: string) => `${prefix}:${name}`;
  return {
    async bind(name, doc) {
      const provider = new IndexeddbPersistence(dbName(name), doc);
      await provider.whenSynced;
      return { destroy: () => void provider.destroy() };
    },
    async remove(name) {
      await new IndexeddbPersistence(dbName(name), new Y.Doc()).clearData();
    },
  };
}

/** In-memory persistence for tests, previews and server rendering. */
export function createMemoryPersistence(): Persistence {
  const store = new Map<string, Uint8Array>();
  return {
    async bind(name, doc) {
      const saved = store.get(name);
      if (saved) Y.applyUpdate(doc, saved);
      const save = () => store.set(name, Y.encodeStateAsUpdate(doc));
      doc.on("update", save);
      return { destroy: () => doc.off("update", save) };
    },
    async remove(name) {
      store.delete(name);
    },
  };
}
