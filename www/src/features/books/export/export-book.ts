import { fileNameFor, saveFile } from "../../../platform/save-file";
import { loadMedia } from "../../../platform/storage/media-store";
import { loadNoteContent } from "../../../platform/storage/note-content-cache";
import { getLibrary } from "../../library/store/library-store";
import type { BookChapter } from "../reader/use-book-content";
import type { BookEntry } from "../store/book-store";
import { buildEpub } from "./build-epub";

/** Exports a book from this device as an EPUB file. */
export async function exportBookAsEpub(book: BookEntry): Promise<void> {
  const library = getLibrary();
  const chapters: BookChapter[] = await Promise.all(
    book.chapterIds.map(async (noteId) => ({
      noteId,
      title: library.get(noteId)?.title || "Untitled",
      document: (await loadNoteContent(noteId).catch(() => undefined)) ?? null,
    })),
  );
  const epub = await buildEpub({
    book,
    chapters,
    loadMedia,
    language: window.document.documentElement.lang || "en",
  });
  await saveFile(epub, fileNameFor(book.title, "epub"), "application/epub+zip");
}
