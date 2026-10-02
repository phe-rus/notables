import { createIndexedDbPersistence } from "@notables/sync";
import * as Y from "yjs";
import { browserMedia } from "../browser/browser-media";
import { browserNoteContent } from "../browser/browser-note-content";
import { nativeStorage } from "./native-commands";

/**
 * Earlier native builds kept everything in the WebView's IndexedDB, which
 * the OS may clear. On first launch with native storage, copy the library,
 * every note, rendered content and media across. The IndexedDB copy is left
 * in place as a fallback. Copies merge, so an interrupted run can repeat.
 */
const MIGRATED = "migrated-browser-storage";

let migration: Promise<void> | undefined;

/** Resolves once browser data is in native storage; never rejects. */
export function browserDataMigrated(): Promise<void> {
  migration ??= migrate().catch((error) => {
    console.error("Could not move notes into native storage", error);
  });
  return migration;
}

async function migrate() {
  if (await nativeStorage.meta(MIGRATED)) return;

  const browser = createIndexedDbPersistence("notables");
  const copyDocument = async (name: string): Promise<Y.Doc | null> => {
    const doc = new Y.Doc();
    const binding = await browser.bind(name, doc);
    binding.destroy();
    if (Y.encodeStateVector(doc).length <= 1) return null;
    await nativeStorage.appendDocumentUpdate(name, Y.encodeStateAsUpdate(doc));
    return doc;
  };

  const library = await copyDocument("library");
  for (const noteId of library?.getMap("notes").keys() ?? []) {
    await copyDocument(`note:${noteId}`);
    const content = await browserNoteContent.load(noteId);
    if (content) await nativeStorage.saveNoteContent(noteId, JSON.stringify(content));
  }
  for (const id of await browserMedia.ids()) {
    const file = await browserMedia.load(id);
    if (file) await nativeStorage.saveMedia(id, file);
  }

  await nativeStorage.setMeta(MIGRATED, new Date().toISOString());
}
