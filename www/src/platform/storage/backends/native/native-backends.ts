import type { UpdateLog } from "@notables/sync";
import type { MediaBackend, NoteContentBackend } from "../storage-backend";
import { browserDataMigrated } from "./browser-data-migration";
import { nativeStorage } from "./native-commands";

/**
 * Storage in the native apps: SQLite and files through the Rust core. Every
 * operation waits for the one-time move of older browser data.
 */

export const nativeUpdateLog: UpdateLog = {
  async load(name) {
    await browserDataMigrated();
    return nativeStorage.documentUpdates(name);
  },
  async append(name, update) {
    await browserDataMigrated();
    await nativeStorage.appendDocumentUpdate(name, update);
  },
  async replace(name, state) {
    await browserDataMigrated();
    await nativeStorage.replaceDocument(name, state);
  },
  async remove(name) {
    await browserDataMigrated();
    await nativeStorage.removeDocument(name);
  },
};

export const nativeMedia: MediaBackend = {
  async save(id, file) {
    await browserDataMigrated();
    await nativeStorage.saveMedia(id, file);
  },
  async load(id) {
    await browserDataMigrated();
    const response = await fetch(nativeStorage.mediaUrl(id));
    return response.ok ? response.blob() : null;
  },
  async remove(id) {
    await browserDataMigrated();
    await nativeStorage.removeMedia(id);
  },
  async url(id) {
    await browserDataMigrated();
    return nativeStorage.mediaUrl(id);
  },
};

export const nativeNoteContent: NoteContentBackend = {
  async save(noteId, document) {
    await browserDataMigrated();
    await nativeStorage.saveNoteContent(noteId, JSON.stringify(document));
  },
  async load(noteId) {
    await browserDataMigrated();
    const stored = await nativeStorage.noteContent(noteId);
    return stored ? JSON.parse(stored) : undefined;
  },
  async remove(noteId) {
    await browserDataMigrated();
    await nativeStorage.removeNoteContent(noteId);
  },
};
