import { unzipSync } from "fflate";
import { naturalCompare, parseName } from "../lib/part-names";
import { isNoise, sourceKind } from "../lib/source-kinds";

export interface ArchivePage {
  name: string;
  bytes: Uint8Array;
  type: string;
}

export interface ArchiveChapter {
  title: string;
  pages: ArchivePage[];
}

const pageTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/**
 * Reads a comic archive (CBZ or ZIP of page images). Folders inside become
 * chapters; a flat archive is one chapter. Pages keep natural order.
 */
export function readComicArchive(bytes: Uint8Array): ArchiveChapter[] {
  const files = unzipSync(bytes);
  const folders = new Map<string, ArchivePage[]>();
  for (const [path, data] of Object.entries(files)) {
    if (path.endsWith("/") || isNoise(path) || path.includes("__MACOSX")) continue;
    const name = path.split("/").pop() ?? path;
    if (sourceKind(name) !== "image") continue;
    const folder = path.split("/").slice(0, -1).join("/");
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const pages = folders.get(folder) ?? [];
    pages.push({ name: path, bytes: data, type: pageTypes[ext] ?? "image/jpeg" });
    folders.set(folder, pages);
  }
  return [...folders.entries()]
    .sort(([a], [b]) => naturalCompare(a, b))
    .map(([folder, pages], index) => {
      const parsed = parseName(folder.split("/").pop() ?? "");
      return {
        title:
          parsed.title || (parsed.chapter ? `Chapter ${parsed.chapter}` : `Chapter ${index + 1}`),
        pages: pages.sort((a, b) => naturalCompare(a.name, b.name)),
      };
    });
}
