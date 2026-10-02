import { convertFileSrc, invoke } from "@tauri-apps/api/core";

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
    const bytes = new Uint8Array(await file.arrayBuffer());
    return invoke("storage_media_save", bytes, {
      headers: { "x-media-id": id, "x-media-type": file.type || "application/octet-stream" },
    });
  },
  /** Streams from disk through the `media` protocol, with range support. */
  mediaUrl(id: string): string {
    return convertFileSrc(id, MEDIA_SCHEME);
  },
  /**
   * A URL the media player can stream: the `media` protocol, except on
   * Linux, where WebKitGTK's player can't read it and the app serves media
   * over a local HTTP address instead.
   */
  async playableUrl(id: string): Promise<string> {
    mediaBase ??= invoke<string | null>("storage_media_base").catch(() => null);
    const base = await mediaBase;
    return base ? `${base}/${encodeURIComponent(id)}` : convertFileSrc(id, MEDIA_SCHEME);
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
