import { readDocument } from "@notables/pluraliti";
import type { Persistence } from "@notables/sync";
import type {
  NoteContentBackend,
  SerializedDocument,
} from "@/platform/storage/backends/storage-backend";
import { openQuietly } from "@/platform/storage/document-storage";

/** Reads the authoritative document and follows late arrivals without opening an editor. */
export async function observeChapter(
  noteId: string,
  persistence: Persistence,
  cache: NoteContentBackend,
  onDocument: (document: SerializedDocument) => void,
): Promise<() => void> {
  const cached = await cache.load(noteId).catch(() => undefined);
  if (cached) onDocument(cached);
  const { doc, release } = await openQuietly(noteId, persistence);
  let active = true;
  let queued = false;
  let saving = Promise.resolve();
  const render = () => {
    if (!active) return;
    const document = readDocument(doc);
    if (!document) return;
    onDocument(document);
    // Preserve write order when several updates arrive while SQLite is busy.
    saving = saving.then(() => cache.save(noteId, document)).catch(() => {});
  };
  const changed = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      render();
    });
  };
  try {
    doc.on("update", changed);
    render();
    return () => {
      active = false;
      doc.off("update", changed);
      release();
    };
  } catch (error) {
    active = false;
    release();
    throw error;
  }
}
