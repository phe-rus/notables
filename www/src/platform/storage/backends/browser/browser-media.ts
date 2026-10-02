import type { MediaBackend } from "../storage-backend";
import { openObjectStore } from "./object-store";

interface StoredMedia {
  blob: Blob;
  createdAt: number;
}

const files = openObjectStore("notables:media", "files");
const objectUrls = new Map<string, string>();

async function load(id: string): Promise<Blob | null> {
  const stored = await files.request<StoredMedia | undefined>("readonly", (s) => s.get(id));
  return stored?.blob ?? null;
}

/** Photos and recordings in IndexedDB, played through object URLs. */
export const browserMedia: MediaBackend & { ids(): Promise<string[]> } = {
  async save(id, blob) {
    await files.request("readwrite", (s) =>
      s.put({ blob, createdAt: Date.now() } satisfies StoredMedia, id),
    );
  },
  load,
  async remove(id) {
    const url = objectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(id);
    await files.request("readwrite", (s) => s.delete(id));
  },
  async url(id) {
    const cached = objectUrls.get(id);
    if (cached) return cached;
    const blob = await load(id).catch(() => null);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrls.set(id, url);
    return url;
  },
  /** Every stored id, for moving files into native storage. */
  async ids() {
    const keys = await files.request("readonly", (s) => s.getAllKeys());
    return keys.map(String);
  },
};
