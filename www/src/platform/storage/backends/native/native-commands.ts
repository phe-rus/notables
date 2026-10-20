import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { devicePlatform } from "@/platform/device-platform";

/**
 * Typed calls into the Rust storage module (`src-tauri/src/storage`).
 * Binary payloads travel as raw IPC bodies, identifiers in headers.
 */

const MEDIA_SCHEME = "media";

/** Splits `[u32 little-endian length][bytes]…` frames. */
export function unframe(buffer: ArrayBuffer): Uint8Array[] {
  const view = new DataView(buffer);
  const frames: Uint8Array[] = [];
  let offset = 0;
  while (offset + 4 <= buffer.byteLength) {
    const length = view.getUint32(offset, true);
    offset += 4;
    frames.push(new Uint8Array(buffer, offset, length));
    offset += length;
  }
  return frames;
}

/** Bytes per piece when a file crosses to the app in pieces. */
const MEDIA_PIECE = 512 * 1024;

/**
 * A blob as base64, encoded natively off the page's thread (encoding in
 * script took 7 of the 16 s an audiobook import spent on the TECNO).
 */
function readBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

let mediaBase: Promise<string | null> | null = null;

export const nativeStorage = {
  async documentUpdates(document: string): Promise<Uint8Array[]> {
    return unframe(await invoke<ArrayBuffer>("storage_document_load", { document }));
  },
  appendDocumentUpdate(document: string, update: Uint8Array): Promise<void> {
    return invoke("storage_document_append", update, { headers: { "x-document": document } });
  },
  replaceDocument(document: string, state: Uint8Array): Promise<void> {
    return invoke("storage_document_replace", state, { headers: { "x-document": document } });
  },
  removeDocument(document: string): Promise<void> {
    return invoke("storage_document_remove", { document });
  },

  async noteContent(noteId: string): Promise<string | null> {
    return invoke<string | null>("storage_note_content_load", { noteId });
  },
  saveNoteContent(noteId: string, document: string): Promise<void> {
    return invoke("storage_note_content_save", { noteId, document });
  },
  removeNoteContent(noteId: string): Promise<void> {
    return invoke("storage_note_content_remove", { noteId });
  },

  async saveMedia(id: string, file: Blob): Promise<void> {
    const mimeType = file.type || "application/octet-stream";
    // Android's WebView sends binary bodies as JSON number arrays (5 MB took
    // 7.5 s on the TECNO and froze the page); base64 pieces are 6x faster
    // and only hold the page for a moment each.
    if (devicePlatform().os === "android" || devicePlatform().os === "chromeos") {
      for (let offset = 0; offset === 0 || offset < file.size; offset += MEDIA_PIECE) {
        const data = await readBase64(file.slice(offset, offset + MEDIA_PIECE));
        await invoke("storage_media_save_part", { id, offset, data });
      }
      return invoke("storage_media_commit", { id, mimeType });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    return invoke("storage_media_save", bytes, {
      headers: { "x-media-id": id, "x-media-type": mimeType },
    });
  },
  /**
   * A URL the media player can stream: the `media` protocol, except on
   * Linux and Android, whose players can't stream from it (WebKitGTK can't
   * read it; Android's WebView mishandles byte ranges there, so audio stalls
   * after the first chunk), where the app serves media over local HTTP.
   */
  async playableUrl(id: string): Promise<string> {
    mediaBase ??= invoke<string | null>("storage_media_base").catch(() => null);
    const base = await mediaBase;
    return base ? `${base}/${encodeURIComponent(id)}` : convertFileSrc(id, MEDIA_SCHEME);
  },
  async mediaList(): Promise<Array<{ id: string; type: string }>> {
    const entries = await invoke<Array<{ id: string; mimeType: string }>>("storage_media_list");
    return entries.map((entry) => ({ id: entry.id, type: entry.mimeType }));
  },
  documentNames(): Promise<string[]> {
    return invoke<string[]>("storage_document_list");
  },
  removeMedia(id: string): Promise<void> {
    return invoke("storage_media_remove", { id });
  },

  meta(key: string): Promise<string | null> {
    return invoke<string | null>("storage_meta_get", { key });
  },
  setMeta(key: string, value: string): Promise<void> {
    return invoke("storage_meta_set", { key, value });
  },
};
