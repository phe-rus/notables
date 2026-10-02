import type { ImportFile } from "./import-plan";

/** What the importers can read: e-books, PDFs, comic archives, page images and audio. */
export const IMPORT_ACCEPT = ".epub,.pdf,.cbz,.zip,image/*,audio/*,.m4b";

/** A picked file with the path it had inside a chosen or dropped folder. */
export function withPath(file: File, path?: string): [ImportFile, File] {
  const relative = path ?? (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const fullPath = relative || file.name;
  return [{ path: fullPath, name: file.name, type: file.type, size: file.size }, file];
}
