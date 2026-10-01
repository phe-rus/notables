import { useEffect, useState } from "react";
import { loadNoteContent } from "../../../platform/note-content-cache";
import { useLibrary } from "../../library/store/library-store";
import type { BookEntry } from "../store/book-store";

export interface BookChapter {
  noteId: string;
  title: string;
  /** Serialized note document, or null if this device has no copy yet. */
  document: unknown | null;
}

/** Loads every chapter's document for reading, in book order. */
export function useBookContent(book: BookEntry | undefined): BookChapter[] | null {
  const notes = useLibrary();
  const [chapters, setChapters] = useState<BookChapter[] | null>(null);
  const chapterKey = book?.chapterIds.join(",") ?? "";

  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    const titles = new Map(notes.map((n) => [n.id, n.title]));
    Promise.all(
      book.chapterIds.map(async (noteId) => ({
        noteId,
        title: titles.get(noteId) || "Untitled",
        document: (await loadNoteContent(noteId).catch(() => undefined)) ?? null,
      })),
    ).then((loaded) => {
      if (!cancelled) setChapters(loaded);
    });
    return () => {
      cancelled = true;
    };
    // Reload only when the chapter list changes, not on every library edit.
  }, [chapterKey]);

  return chapters;
}
