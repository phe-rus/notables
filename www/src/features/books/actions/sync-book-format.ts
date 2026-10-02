import { loadNoteContent } from "../../../platform/storage/note-content-cache";
import { getLibrary } from "../../library/store/library-store";
import { isRecordingChapter } from "../lib/chapter-media";
import { type BookEntry, getBookStore } from "../store/book-store";
import { getSeriesStore } from "../store/series-store";

/** Live chapters of an item, in order. */
function liveChapters(book: BookEntry): string[] {
  const library = getLibrary();
  return book.chapterIds.filter((id) => {
    const entry = library.get(id);
    return entry && !entry.trashedAt;
  });
}

/** Whether an item has chapters and every one still in it is a recording. */
async function isAllRecordings(book: BookEntry): Promise<boolean> {
  const live = liveChapters(book);
  if (live.length === 0) return false;
  const documents = await Promise.all(live.map((id) => loadNoteContent(id).catch(() => undefined)));
  return documents.every((document) => document && isRecordingChapter(document));
}

/**
 * A book follows what is left in it: once every chapter still in it is a
 * recording (written ones were deleted, or tracks were added to an empty
 * book), it becomes an audiobook and opens in the player. A book in a
 * series switches only when every live volume with chapters qualifies, and
 * then the whole series switches with it, so a series never mixes kinds.
 */
export async function syncBookFormat(bookId: string): Promise<void> {
  const store = getBookStore();
  const book = store.getSnapshot().find((entry) => entry.id === bookId);
  if (!book || store.kindOf(book) !== "book") return;
  if (!(await isAllRecordings(book))) return;

  const seriesStore = getSeriesStore();
  const series = book.seriesId ? seriesStore.series.get(book.seriesId) : undefined;
  if (!series) {
    store.update(bookId, { kind: "audiobook" });
    return;
  }
  const members = [...store.books.values()].filter((item) => item.seriesId === series.id);
  const siblings = members.filter(
    (item) => item.id !== book.id && !item.trashedAt && liveChapters(item).length > 0,
  );
  const qualifies = await Promise.all(siblings.map(isAllRecordings));
  if (!qualifies.every(Boolean)) return;
  getLibrary().doc.transact(() => {
    seriesStore.update(series.id, { kind: "audiobook" });
    for (const item of members) store.update(item.id, { kind: "audiobook" });
  });
}
