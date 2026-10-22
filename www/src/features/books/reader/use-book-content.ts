import { useEffect, useMemo, useState } from "react";
import { useLibrary } from "@/features/library/store/library-store";
import { persistenceFor, useShareSessionsVersion } from "@/features/sharing/lib/share-sessions";
import { t } from "@/i18n/i18n";
import {
  deleteNoteContent,
  loadNoteContent,
  saveNoteContent,
} from "@/platform/storage/note-content-cache";
import { partOpenings } from "../lib/chapter-outline";
import { observeChapter } from "../lib/observe-chapter";
import type { BookChapter, LoadedBookContent } from "../model/types";
import type { BookEntry } from "../store/book-store";

export type { BookChapter } from "../model/types";

/** Reads chapter documents independently of the editor's local preview cache. */
export function useBookContent(book: BookEntry | undefined): BookChapter[] | null {
  const notes = useLibrary();
  const sessions = useShareSessionsVersion();
  const ids = book?.chapterIds.join(",") ?? "";
  const bookId = book?.id;
  const [loaded, setLoaded] = useState<LoadedBookContent | null>(null);
  const key = `${bookId ?? ""}:${ids}`;

  useEffect(() => {
    if (!bookId) return;
    let active = true;
    let ready = false;
    const releases = new Set<() => void>();
    const documents = new Map<string, unknown>();
    const publish = () => {
      if (active && ready) setLoaded({ key, documents: new Map(documents) });
    };
    const cache = { load: loadNoteContent, save: saveNoteContent, remove: deleteNoteContent };
    const opening = (ids ? ids.split(",") : []).map((noteId) =>
      observeChapter(noteId, persistenceFor(noteId), cache, (document) => {
        if (!active) return;
        documents.set(noteId, document);
        publish();
      })
        .then((release) => {
          if (active) releases.add(release);
          else release();
        })
        .catch(() => {
          // Keep other chapters readable if one document is not available yet.
        }),
    );
    void Promise.all(opening).then(() => {
      ready = true;
      publish();
    });
    return () => {
      active = false;
      for (const release of releases) release();
    };
  }, [bookId, ids, key, sessions]);

  return useMemo(() => {
    if (!book || loaded?.key !== key) return null;
    const titles = new Map(notes.map((note) => [note.id, note.title]));
    const trashed = new Set(notes.filter((note) => note.trashedAt).map((note) => note.id));
    const openings = partOpenings(book, (noteId) => !trashed.has(noteId));
    return book.chapterIds
      .filter((noteId) => !trashed.has(noteId))
      .map((noteId) => ({
        noteId,
        title: titles.get(noteId) || t("common.untitled"),
        document: loaded.documents.get(noteId) ?? null,
        ...(openings.has(noteId) ? { part: openings.get(noteId) } : {}),
      }));
  }, [book, key, loaded, notes]);
}
