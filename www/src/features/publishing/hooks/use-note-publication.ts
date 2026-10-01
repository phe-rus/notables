import { createPublicationSnapshot, readingMinutes } from "@notables/core";
import { useDocumentSnapshot } from "@notables/editor";
import { useCallback, useState } from "react";
import type * as Y from "yjs";
import { setAuthorName } from "../../../platform/author-preferences";
import { publicUrl } from "../../../platform/public-url";
import { publishNote, unpublishNote } from "../../../server/publications/publications.functions";
import { getLibrary, type LibraryEntry } from "../../library/store/library-store";

export type PublicationAction = "publish" | "unpublish";

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/**
 * Publishing state and actions for one note. Must be used inside its
 * editor, which it snapshots when publishing.
 */
export function useNotePublication(entry: LibraryEntry, doc: Y.Doc) {
  const snapshot = useDocumentSnapshot();
  const [pending, setPending] = useState<PublicationAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPublished = Boolean(entry.publicationId && entry.publishKey);
  const link = entry.publicationId ? publicUrl(`/p/${entry.publicationId}`) : null;

  /** Publishes the note, or updates the existing publication. */
  const publish = useCallback(
    async (authorName: string): Promise<boolean> => {
      const name = authorName.trim();
      if (!name) {
        setError("Add the name readers will see.");
        return false;
      }
      setPending("publish");
      setError(null);
      try {
        const { document, text } = snapshot();
        const { title, excerpt } = createPublicationSnapshot(doc, {
          kind: entry.kind,
          text,
          document,
        });
        setAuthorName(name);
        const result = await publishNote({
          data: {
            noteId: entry.id,
            kind: entry.kind,
            title,
            excerpt,
            authorName: name,
            readingMinutes: readingMinutes(text),
            document: document as unknown as { root: { children: unknown[] } },
            key: entry.publishKey ?? undefined,
          },
        });
        getLibrary().update(entry.id, {
          publicationId: result.publication.id,
          publishKey: result.key,
        });
        return true;
      } catch (cause) {
        setError(errorMessage(cause, "Couldn’t publish. Try again."));
        return false;
      } finally {
        setPending(null);
      }
    },
    [doc, entry, snapshot],
  );

  /** Removes the public copy; the private note is untouched. */
  const unpublish = useCallback(async (): Promise<boolean> => {
    if (!entry.publicationId || !entry.publishKey) return false;
    setPending("unpublish");
    setError(null);
    try {
      await unpublishNote({ data: { id: entry.publicationId, key: entry.publishKey } });
      getLibrary().update(entry.id, { publicationId: null, publishKey: null });
      return true;
    } catch (cause) {
      setError(errorMessage(cause, "Couldn’t unpublish. Try again."));
      return false;
    } finally {
      setPending(null);
    }
  }, [entry]);

  return { isPublished, link, pending, error, publish, unpublish };
}
