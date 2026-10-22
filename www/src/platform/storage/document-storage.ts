import {
  createIndexedDbPersistence,
  createSharedPersistence,
  createUpdateLogPersistence,
  type Persistence,
  type PersistenceBinding,
  type RemoteSync,
} from "@notables/sync";
import * as Y from "yjs";
import { ownsLibrary } from "../library-access";
import { isTauri } from "../runtime";
import { phoneConnection } from "../session/phone-connection";
import { createSessionPersistence } from "../session/session-persistence";
import { nativeUpdateLog } from "./backends/native/native-backends";
import { nativeStorage } from "./backends/native/native-commands";

let persistence: Persistence | undefined;

/**
 * On-device storage for Yjs documents (the library and every note):
 * SQLite through the Rust core in the native apps, IndexedDB in browsers,
 * and the phone itself for a browser linked to one (spec 0005).
 */
export function getPersistence(): Persistence {
  if (!persistence) {
    const phone = phoneConnection();
    if (isTauri()) {
      // Shared, so a browser this phone serves and its own editor can hold one note together.
      persistence = watchOpened(
        flushWhenHidden(createSharedPersistence(createUpdateLogPersistence(nativeUpdateLog))),
      );
    } else if (phone) {
      persistence = createSessionPersistence(phone.client);
    } else {
      if (!ownsLibrary()) throw new Error("Link a phone before opening a library");
      persistence = createSharedPersistence(createIndexedDbPersistence("notables"));
      void requestPersistentStorage();
    }
  }
  return persistence;
}

export interface OpenWatcher {
  /** A screen (or a browser this phone serves) opened a document. */
  opened(name: string): void;
  /** The last one holding it let go. */
  closed(name: string): void;
}

const watchers = new Set<OpenWatcher>();
const openCounts = new Map<string, number>();
/** Copies the sync engine opens: they don't count as someone looking at the document. */
const quiet = new WeakSet<Y.Doc>();

/** Learns which documents are open on this device, so linked devices keep them live. */
export function watchOpenDocuments(watcher: OpenWatcher): () => void {
  watchers.add(watcher);
  for (const name of openCounts.keys()) watcher.opened(name);
  return () => watchers.delete(watcher);
}

/** Opens a document for syncing, without it counting as open on this device. */
export async function openQuietly(
  name: string,
  storage: Persistence = getPersistence(),
): Promise<{ doc: Y.Doc; release(): void }> {
  const doc = new Y.Doc();
  quiet.add(doc);
  try {
    const binding = await storage.bind(name, doc);
    return {
      doc,
      release() {
        binding.destroy();
        doc.destroy();
      },
    };
  } catch (error) {
    doc.destroy();
    throw error;
  }
}

function watchOpened(inner: Persistence): Persistence {
  return {
    async bind(name, doc) {
      const binding = await inner.bind(name, doc);
      if (quiet.has(doc)) return binding;
      const count = (openCounts.get(name) ?? 0) + 1;
      openCounts.set(name, count);
      if (count === 1) for (const watcher of watchers) watcher.opened(name);
      let released = false;
      return {
        destroy() {
          binding.destroy();
          if (released) return;
          released = true;
          const left = (openCounts.get(name) ?? 1) - 1;
          if (left > 0) openCounts.set(name, left);
          else {
            openCounts.delete(name);
            for (const watcher of watchers) watcher.closed(name);
          }
        },
        flush: binding.flush,
      };
    },
    remove: (name) => inner.remove(name),
  };
}

/**
 * Browsers may clear site data when space runs low unless the site's
 * storage is marked persistent. Ask once; browsers grant it to sites
 * people use, and installed web apps.
 */
async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported; storage stays best-effort.
  }
}

/**
 * Native storage batches edits for a moment; write them straight away when
 * the app is backgrounded or closed so nothing typed is lost.
 */
function flushWhenHidden(inner: Persistence): Persistence {
  const open = new Set<PersistenceBinding>();
  const flushAll = () => {
    for (const binding of open) void binding.flush?.();
  };
  window.addEventListener("pagehide", flushAll);
  window.document.addEventListener("visibilitychange", () => {
    if (window.document.visibilityState === "hidden") flushAll();
  });
  return {
    async bind(name, doc) {
      const binding = await inner.bind(name, doc);
      open.add(binding);
      return {
        destroy() {
          open.delete(binding);
          binding.destroy();
        },
        flush: binding.flush,
      };
    },
    remove: (name) => inner.remove(name),
  };
}

/**
 * Cloud sync is off until identity exists (ADR-0005). Set VITE_SYNC_HOST in
 * a local `.env` to try multi-device sync against a development Worker.
 */
export function getRemoteSync(): RemoteSync | null {
  const host = import.meta.env.VITE_SYNC_HOST as string | undefined;
  return host ? { host } : null;
}

/**
 * Every stored document's name, where storage can list them (the native
 * apps); null in browsers, whose documents are found through the library.
 */
export async function listDocuments(): Promise<string[] | null> {
  return isTauri() ? nativeStorage.documentNames() : null;
}
