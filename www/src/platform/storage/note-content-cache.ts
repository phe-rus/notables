import { isTauri } from "../runtime";
import { browserNoteContent } from "./backends/browser/browser-note-content";
import { nativeNoteContent } from "./backends/native/native-backends";
import type { NoteContentBackend, SerializedDocument } from "./backends/storage-backend";

/**
 * The latest serialized document of each note, kept on the device so books
 * and previews can render notes without opening their editors.
 */
let backend: NoteContentBackend | undefined;
const contents = () => {
  backend ??= isTauri() ? nativeNoteContent : browserNoteContent;
  return backend;
};

export function saveNoteContent(noteId: string, document: SerializedDocument): Promise<void> {
  return contents().save(noteId, document);
}

export function loadNoteContent(noteId: string): Promise<SerializedDocument | undefined> {
  return contents().load(noteId);
}

export function deleteNoteContent(noteId: string): Promise<void> {
  return contents().remove(noteId);
}
