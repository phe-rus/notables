import { loadNoteContent } from "../../../platform/storage/note-content-cache";
import { getLibrary } from "../../library/store/library-store";
import { isRecordingChapter } from "../lib/chapter-media";
import { bookFormat, getBookStore } from "../store/book-store";

/**
 * A book follows what is left in it: once every chapter still in the book
 * is a recording (written ones were deleted, or tracks were added to an
 * empty book), it becomes an audiobook and opens in the player.
 */
export async function syncBookFormat(bookId: string): Promise<void> {
  const store = getBookStore();
  const book = store.getSnapshot().find((entry) => entry.id === bookId);
  if (!book || bookFormat(book) !== "prose") return;
  const library = getLibrary();
  const live = book.chapterIds.filter((id) => {
    const entry = library.get(id);
    return entry && !entry.trashedAt;
  });
  if (live.length === 0) return;
  const documents = await Promise.all(live.map((id) => loadNoteContent(id).catch(() => undefined)));
  if (documents.every((document) => document && isRecordingChapter(document))) {
    store.update(bookId, { format: "audio", direction: "ltr" });
  }
}
