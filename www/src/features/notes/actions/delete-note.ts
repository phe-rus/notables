import { getBookStore } from "@/features/books/store/book-store";
import { getLibrary } from "@/features/library/store/library-store";
import { collectLocalMedia } from "@/lib/documents/collect-local-media";
import { deleteMedia } from "@/platform/storage/media-store";
import { deleteNoteContent, loadNoteContent } from "@/platform/storage/note-content-cache";

/**
 * Deletes a note from this device: its document, cached content,
 * recordings and photos, and its place in any book.
 */
export async function deleteNote(noteId: string): Promise<void> {
  const content = await loadNoteContent(noteId).catch(() => undefined);
  await Promise.all(collectLocalMedia(content).map((id) => deleteMedia(id).catch(() => {})));
  getBookStore().forgetNote(noteId);
  await Promise.all([getLibrary().remove(noteId), deleteNoteContent(noteId)]);
}
