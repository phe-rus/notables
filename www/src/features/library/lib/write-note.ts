import type { NoteKind } from "@notables/core";
import type { DocumentSnapshot } from "@notables/editor";
import * as Y from "yjs";
import { getPersistence } from "../../../platform/storage/document-storage";
import { saveNoteContent } from "../../../platform/storage/note-content-cache";
import { documentText } from "../../search/lib/document-text";
import { summarize } from "../model/library-views";
import { getLibrary, type LibraryEntry } from "../store/library-store";

export interface NewNote {
  kind: NoteKind;
  /** Writes the document, e.g. with composeDocumentFromMarkdown. */
  compose: (doc: Y.Doc) => DocumentSnapshot["document"];
  pinned?: boolean;
  /** For chapters that belong to an imported book. */
  bookId?: string;
  updatedAt?: number;
}

/**
 * Creates a note with content written straight into its stored document,
 * as if typed: indexed in the library, cached for previews and search.
 */
export async function writeNote({
  kind,
  compose,
  pinned,
  bookId,
  updatedAt,
}: NewNote): Promise<LibraryEntry> {
  const library = getLibrary();
  const entry = library.create(kind);
  const doc = new Y.Doc();
  const binding = await getPersistence().bind(`note:${entry.id}`, doc);
  const document = compose(doc);
  await binding.flush?.();
  binding.destroy();
  doc.destroy();
  await saveNoteContent(entry.id, document);
  const { title, excerpt } = summarize(documentText(document));
  library.update(entry.id, {
    title,
    excerpt,
    pinned: pinned ?? false,
    bookId: bookId ?? null,
    updatedAt: updatedAt ?? Date.now(),
  });
  return { ...entry, title, excerpt };
}
