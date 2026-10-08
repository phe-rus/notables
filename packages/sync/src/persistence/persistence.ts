import type * as Y from "yjs";

/**
 * On-device storage for Yjs documents. The web and the Tauri WebView use
 * IndexedDB; the native apps keep an update log in SQLite through the
 * Rust core.
 */
export interface PersistenceBinding {
  /** Stops storing updates, writing any that are still pending. */
  destroy(): void;
  /** Writes pending updates now, for stores that batch them. */
  flush?(): Promise<void>;
}

export interface Persistence {
  /** Applies the stored state to `doc`, then keeps storing its updates. */
  bind(name: string, doc: Y.Doc): Promise<PersistenceBinding>;
  /** Permanently removes a document's local state. */
  remove(name: string): Promise<void>;
}
