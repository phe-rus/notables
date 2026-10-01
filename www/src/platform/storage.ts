import { createIndexedDbPersistence, type Persistence, type RemoteSync } from "@notables/sync";

let persistence: Persistence | undefined;

/** On-device storage for Yjs documents (IndexedDB in browsers and the Tauri WebView). */
export function getPersistence(): Persistence {
  persistence ??= createIndexedDbPersistence("notables");
  return persistence;
}

/**
 * Cloud sync is off until identity exists (ADR-0005). Set VITE_SYNC_HOST in
 * a local `.env` to try multi-device sync against a development Worker.
 */
export function getRemoteSync(): RemoteSync | null {
  const host = import.meta.env.VITE_SYNC_HOST as string | undefined;
  return host ? { host } : null;
}
