import { stripLeadingTitle } from "../../../lib/documents/strip-leading-title";
import { loadNoteContent } from "../../../platform/storage/note-content-cache";
import { getLibrary } from "../../library/store/library-store";
import { kindOfBook } from "../lib/book-kind";
import { isDrawnKind, type MediaKind } from "../model/media-kind";
import type { BookEntry } from "../store/book-store";
import { type Block, documentBlocks } from "./document-blocks";

export interface MaterialChapter {
  noteId: string;
  title: string;
  /** The stored document without its title line, or null if not on this device. */
  document: unknown | null;
  blocks: Block[];
}

/** Everything an export needs: the book's details and each chapter's content. */
export interface BookMaterial {
  book: BookEntry;
  /** The item's kind, read through its series. */
  kind: MediaKind;
  title: string;
  author: string;
  chapters: MaterialChapter[];
}

export async function loadBookMaterial(book: BookEntry): Promise<BookMaterial> {
  const library = getLibrary();
  const chapters = await Promise.all(
    book.chapterIds
      .filter((noteId) => !library.get(noteId)?.trashedAt)
      .map(async (noteId) => {
        const title = library.get(noteId)?.title || "Untitled";
        const stored = (await loadNoteContent(noteId).catch(() => undefined)) ?? null;
        const document = stored ? stripLeadingTitle(stored, title) : null;
        return { noteId, title, document, blocks: document ? documentBlocks(document) : [] };
      }),
  );
  return {
    book,
    kind: kindOfBook(book),
    title: book.title.trim() || "Untitled",
    author: book.author.trim(),
    chapters,
  };
}

/** Pages of a comic or manga, in reading order. */
export function materialPages(material: BookMaterial): string[] {
  return material.chapters.flatMap((chapter) =>
    chapter.blocks.flatMap((block) => (block.type === "image" ? [block.src] : [])),
  );
}

export function materialRecordings(material: BookMaterial) {
  return material.chapters.flatMap((chapter) =>
    chapter.blocks.flatMap((block) =>
      block.type === "audio" ? [{ chapter: chapter.title, ...block }] : [],
    ),
  );
}

export const isDrawnBook = (book: BookEntry) => isDrawnKind(kindOfBook(book));
