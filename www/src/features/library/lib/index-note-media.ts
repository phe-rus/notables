import { loadNoteContent } from "../../../platform/storage/note-content-cache";
import { getLibrary, isListedNote } from "../store/library-store";
import { notePreview } from "./note-preview";

/** Fill older notes' thumbnails from local snapshots without changing their edited dates. */
export function indexNoteMedia() {
  const library = getLibrary();
  const attempted = new Set<string>();
  let stopped = false;
  let running = false;
  const run = async () => {
    if (running || stopped) return;
    running = true;
    try {
      for (const entry of library.getSnapshot()) {
        if (stopped) break;
        if (!isListedNote(entry) || entry.previewContent !== undefined || attempted.has(entry.id))
          continue;
        attempted.add(entry.id);
        const document = await loadNoteContent(entry.id).catch(() => undefined);
        if (!document || stopped || library.get(entry.id)?.previewContent !== undefined) continue;
        const { previewImage, previewContent, attachmentCount } = notePreview(document);
        library.update(entry.id, { previewImage, previewContent, attachmentCount });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      running = false;
    }
  };
  const unsubscribe = library.subscribe(() => void run());
  void run();
  return () => {
    stopped = true;
    unsubscribe();
  };
}
