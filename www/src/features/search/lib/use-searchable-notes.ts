import { useEffect, useMemo, useState } from "react";
import { loadNoteContent } from "../../../platform/storage/note-content-cache";
import { type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { documentText } from "./document-text";
import type { Searchable } from "./rank";

export interface SearchableNote extends Searchable {
  entry: LibraryEntry;
}

/** Full text by note id, refreshed when a note's `updatedAt` changes. */
const texts = new Map<string, { updatedAt: number; text: string }>();

/**
 * Every note with its full text, for searching. Text loads from the
 * on-device content cache while `enabled`; until then excerpts stand in.
 */
export function useSearchableNotes(enabled: boolean): SearchableNote[] {
  const entries = useLibrary();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      let changed = false;
      for (const entry of entries) {
        if (cancelled) return;
        if (texts.get(entry.id)?.updatedAt === entry.updatedAt) continue;
        const document = await loadNoteContent(entry.id).catch(() => undefined);
        texts.set(entry.id, {
          updatedAt: entry.updatedAt,
          text: document ? documentText(document) : `${entry.title}\n${entry.excerpt}`,
        });
        changed = true;
      }
      if (changed && !cancelled) setVersion((v) => v + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [entries, enabled]);

  return useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: texts.get(entry.id)?.text ?? entry.excerpt,
        updatedAt: entry.updatedAt,
        entry,
      })),
    // `version` changes whenever `texts` gains new text.
    [entries, version],
  );
}
