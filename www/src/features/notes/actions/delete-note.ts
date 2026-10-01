import { deleteNoteContent } from "../../../platform/note-content-cache";
import { getBookStore } from "../../books/store/book-store";
import { getLibrary } from "../../library/store/library-store";

/** Deletes a note from this device: its document, cached content and book chapters. */
export async function deleteNote(noteId: string): Promise<void> {
  getBookStore().forgetNote(noteId);
  await Promise.all([getLibrary().remove(noteId), deleteNoteContent(noteId)]);
}
