import type { DocumentSnapshot } from "@notables/editor";

/** A note's rendered document (Lexical JSON). */
export type SerializedDocument = DocumentSnapshot["document"];

/** Where photos and recordings live: IndexedDB in browsers, files in the native apps. */
export interface MediaBackend {
  save(id: string, file: Blob): Promise<void>;
  load(id: string): Promise<Blob | null>;
  remove(id: string): Promise<void>;
  /** A URL the WebView can display or play, or null when the file is missing. */
  url(id: string): Promise<string | null>;
}

/** The latest rendered document of each note, for books and previews. */
export interface NoteContentBackend {
  save(noteId: string, document: SerializedDocument): Promise<void>;
  load(noteId: string): Promise<SerializedDocument | undefined>;
  remove(noteId: string): Promise<void>;
}
