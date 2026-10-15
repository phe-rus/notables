import * as Y from "yjs";
import type { Persistence, PersistenceBinding } from "./persistence";

interface Entry {
  /** The one copy bound to storage. */
  primary: Y.Doc;
  binding: PersistenceBinding;
  /** Each open copy, how to unlink it, and how many bindings hold it. */
  members: Map<Y.Doc, { unlink: () => void; holders: number }>;
}

/**
 * Lets several copies of one document be open at once (the phone's editor
 * and a browser it serves, say) and keeps them in step in memory. Storage
 * binds a single hidden copy per document; every copy opened through here
 * mirrors it, so each edit is stored once and reaches every open copy.
 */
export function createSharedPersistence(inner: Persistence): Persistence {
  const entries = new Map<string, Entry>();
  const opening = new Map<string, Promise<Entry>>();

  const entryFor = (name: string): Promise<Entry> => {
    const existing = entries.get(name);
    if (existing) return Promise.resolve(existing);
    let pending = opening.get(name);
    if (!pending) {
      pending = (async () => {
        const primary = new Y.Doc();
        const binding = await inner.bind(name, primary);
        const entry: Entry = { primary, binding, members: new Map() };
        entries.set(name, entry);
        return entry;
      })().finally(() => opening.delete(name));
      opening.set(name, pending);
    }
    return pending;
  };

  return {
    async bind(name, doc) {
      const entry = await entryFor(name);
      const { primary } = entry;
      const release = () => {
        const member = entry.members.get(doc);
        if (!member) return;
        member.holders -= 1;
        if (member.holders > 0) return;
        member.unlink();
        entry.members.delete(doc);
        if (entry.members.size === 0 && entries.get(name) === entry) {
          entries.delete(name);
          entry.binding.destroy();
          primary.destroy();
        }
      };
      const flush = () => entry.binding.flush?.() ?? Promise.resolve();
      // The same copy bound again (an editor remounting) shares its link.
      const existing = entry.members.get(doc);
      if (existing) {
        existing.holders += 1;
        return { destroy: release, flush };
      }
      const toMember = Symbol(`mirror:${name}`);
      const toPrimary = Symbol(`mirror:${name}`);
      // Whatever the copy already holds (a note seeded before binding) joins the stored state.
      Y.applyUpdate(primary, Y.encodeStateAsUpdate(doc), toPrimary);
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(primary), toMember);
      const fromPrimary = (update: Uint8Array, origin: unknown) => {
        if (origin !== toPrimary) Y.applyUpdate(doc, update, toMember);
      };
      const fromMember = (update: Uint8Array, origin: unknown) => {
        if (origin !== toMember) Y.applyUpdate(primary, update, toPrimary);
      };
      primary.on("update", fromPrimary);
      doc.on("update", fromMember);
      entry.members.set(doc, {
        holders: 1,
        unlink: () => {
          primary.off("update", fromPrimary);
          doc.off("update", fromMember);
        },
      });
      return { destroy: release, flush };
    },
    async remove(name) {
      const entry = entries.get(name);
      if (entry) {
        entries.delete(name);
        for (const member of entry.members.values()) member.unlink();
        entry.binding.destroy();
        entry.primary.destroy();
      }
      await inner.remove(name);
    },
  };
}
