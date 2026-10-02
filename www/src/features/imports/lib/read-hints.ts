import { archiveHint } from "../importers/kind-hints";
import { readEpubOutline } from "../importers/read-epub";
import type { ContentHint, ImportPlan } from "./import-plan";

/**
 * Reads what comic archives and e-books say about themselves (manga or
 * comic, and an e-book's parts) before the preview shows, one file at a time.
 */
export async function readContentHints(
  plan: ImportPlan,
  files: ReadonlyMap<string, File>,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, ContentHint>> {
  const containers = plan.series
    .flatMap((series) => series.books)
    .flatMap((book) =>
      book.container && (book.containerKind === "archive" || book.containerKind === "epub")
        ? [{ path: book.container.path, epub: book.containerKind === "epub" }]
        : [],
    );
  const hints = new Map<string, ContentHint>();
  for (const [index, { path, epub }] of containers.entries()) {
    const file = files.get(path);
    if (!file) continue;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (epub) {
      const outline = readEpubOutline(bytes);
      hints.set(path, { kind: outline.rtl ? "manga" : null, parts: outline.parts });
    } else {
      hints.set(path, { kind: archiveHint(bytes), parts: [] });
    }
    onProgress?.(index + 1, containers.length);
  }
  return hints;
}
