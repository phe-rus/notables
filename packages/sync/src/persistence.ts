import type * as Y from "yjs";

/**
 * Local, on-device storage for note documents. Each platform supplies its
 * own implementation: IndexedDB on the web, SQLite on mobile and desktop.
 */
export interface NotePersistence {
  /** Applies the stored state to `doc` and keeps storing further updates. */
  bind(noteId: string, doc: Y.Doc): Promise<{ destroy(): void }>;
  /** Permanently removes a note's local state. */
  remove(noteId: string): Promise<void>;
}
