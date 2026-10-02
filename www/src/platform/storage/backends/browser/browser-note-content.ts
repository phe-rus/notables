import type { NoteContentBackend, SerializedDocument } from "../storage-backend";
import { openObjectStore } from "./object-store";

const documents = openObjectStore("notables:note-content", "documents");

/** Rendered note documents in IndexedDB. */
export const browserNoteContent: NoteContentBackend = {
  async save(noteId, document) {
    await documents.request("readwrite", (s) => s.put(document, noteId));
  },
  load(noteId) {
    return documents.request<SerializedDocument | undefined>("readonly", (s) => s.get(noteId));
  },
  async remove(noteId) {
    await documents.request("readwrite", (s) => s.delete(noteId));
  },
};
