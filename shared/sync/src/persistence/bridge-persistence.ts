import * as Y from "yjs";
import type { Persistence, PersistenceBinding } from "./persistence";

const BRIDGED = Symbol("bridged");

/**
 * Binds a document to another live document instead of storage, keeping
 * them identical in both directions. Lets an editor open a note that a
 * background session (a shared note, say) already holds, without the two
 * drifting apart or storing every edit twice.
 */
export function bridgePersistence(source: Y.Doc, fallback: Persistence): Persistence {
  return {
    async bind(_name: string, doc: Y.Doc): Promise<PersistenceBinding> {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(source), BRIDGED);
      const toDoc = (update: Uint8Array, origin: unknown) => {
        if (origin !== BRIDGED) Y.applyUpdate(doc, update, BRIDGED);
      };
      const toSource = (update: Uint8Array, origin: unknown) => {
        if (origin !== BRIDGED) Y.applyUpdate(source, update, BRIDGED);
      };
      source.on("update", toDoc);
      doc.on("update", toSource);
      return {
        destroy() {
          source.off("update", toDoc);
          doc.off("update", toSource);
        },
      };
    },
    remove: (name) => fallback.remove(name),
  };
}
