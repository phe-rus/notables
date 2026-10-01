/**
 * Saves a generated file. Browsers download it; the native apps will route
 * this through the system save dialog from the Rust core.
 */
export function saveFile(data: Uint8Array | Blob, fileName: string, type: string): void {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** A safe, readable file name from a title. */
export function fileNameFor(title: string, extension: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${base || "untitled"}.${extension}`;
}
