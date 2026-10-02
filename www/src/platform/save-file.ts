import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./runtime";

export type SaveOutcome = "saved" | "cancelled";

/**
 * Saves a generated file the way the system expects: the native apps show
 * the system save dialog (through the Rust core); browsers download it.
 */
export async function saveFile(
  data: Uint8Array | Blob,
  fileName: string,
  type: string,
): Promise<SaveOutcome> {
  if (isTauri()) {
    const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
    const path = await invoke<string | null>("export_save_file", bytes, {
      headers: { "x-file-name": fileName },
    });
    return path ? "saved" : "cancelled";
  }
  downloadInBrowser(data, fileName, type);
  return "saved";
}

function downloadInBrowser(data: Uint8Array | Blob, fileName: string, type: string): void {
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
