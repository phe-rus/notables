import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import type { Persistence } from "./persistence";

/** Stores each document in its own IndexedDB database, named `<prefix>:<name>`. */
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
