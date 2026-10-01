import type * as Y from "yjs";

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
