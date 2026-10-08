import * as Y from "yjs";
import type { Persistence } from "./persistence";

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
