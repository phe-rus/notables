import {
  createIndexedDbPersistence,
  createUpdateLogPersistence,
  type Persistence,
  type PersistenceBinding,
  type RemoteSync,
} from "@notables/sync";
import { isTauri } from "../runtime";
import { nativeUpdateLog } from "./backends/native/native-backends";

let persistence: Persistence | undefined;

/**
 * On-device storage for Yjs documents (the library and every note):
 * SQLite through the Rust core in the native apps, IndexedDB in browsers.
 */
export function getPersistence(): Persistence {
  if (!persistence) {
    if (isTauri()) {
      persistence = flushWhenHidden(createUpdateLogPersistence(nativeUpdateLog));
    } else {
      persistence = createIndexedDbPersistence("notables");
      void requestPersistentStorage();
    }
  }
  return persistence;
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
