import type { MediaBackend, NoteContentBackend, SerializedDocument } from "../storage-backend";

/*
 * Storage for a browser session: memory only, gone when the tab closes.
 * The phone keeps everything; the browser keeps nothing (spec 0005, AC-22).
 */

const contents = new Map<string, SerializedDocument>();

export const memoryNoteContent: NoteContentBackend = {
  save: async (noteId, document) => void contents.set(noteId, document),
  load: async (noteId) => contents.get(noteId),
  remove: async (noteId) => void contents.delete(noteId),
};

const files = new Map<string, Blob>();
const urls = new Map<string, string>();

export const memoryMedia: MediaBackend = {
  save: async (id, file) => void files.set(id, file),
  load: async (id) => files.get(id) ?? null,
  remove: async (id) => {
    files.delete(id);
    const url = urls.get(id);
    if (url) URL.revokeObjectURL(url);
    urls.delete(id);
  },
  url: async (id) => {
    const file = files.get(id);
    if (!file) return null;
    let url = urls.get(id);
    if (!url) {
      url = URL.createObjectURL(file);
      urls.set(id, url);
    }
    return url;
  },
  list: async () => [...files].map(([id, file]) => ({ id, type: file.type })),
};
