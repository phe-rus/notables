import * as Y from "yjs";
import type { NotePersistence } from "./persistence";

/** In-memory persistence for tests, previews and signed-out web demos. */
export function createMemoryPersistence(): NotePersistence {
  const store = new Map<string, Uint8Array>();

  return {
    async bind(noteId, doc) {
      const saved = store.get(noteId);
      if (saved) Y.applyUpdate(doc, saved);
      const save = () => store.set(noteId, Y.encodeStateAsUpdate(doc));
      doc.on("update", save);
      return { destroy: () => doc.off("update", save) };
    },
    async remove(noteId) {
      store.delete(noteId);
    },
  };
}
