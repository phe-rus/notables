import { createId } from "@notables/core";
import { isTauri } from "../runtime";
import { browserMedia } from "./backends/browser/browser-media";
import { nativeMedia } from "./backends/native/native-backends";
import type { MediaBackend } from "./backends/storage-backend";

/**
 * Recordings and photos stored on this device. Documents refer to them as
 * `media:<id>`. Native apps keep them as files; browsers use IndexedDB.
 */
let backend: MediaBackend | undefined;
const media = () => {
  backend ??= isTauri() ? nativeMedia : browserMedia;
  return backend;
};

/** Stores a file and returns its media id. */
export async function saveMedia(file: Blob): Promise<string> {
  const id = createId();
  await media().save(id, file);
  return id;
}

/** Stores a file under an id it already has, as when it arrives from another device. */
export function saveMediaAs(id: string, file: Blob): Promise<void> {
  return media().save(id, file);
}

export async function hasMedia(id: string): Promise<boolean> {
  return (await media().load(id)) !== null;
}

/** Every stored file and its type. */
export function listMedia(): Promise<Array<{ id: string; type: string }>> {
  return media().list();
}

export function loadMedia(id: string): Promise<Blob | null> {
  return media().load(id);
}

export function deleteMedia(id: string): Promise<void> {
  return media().remove(id);
}

/** A URL to display or play a stored file. */
export function resolveMediaUrl(id: string): Promise<string | null> {
  return media()
    .url(id)
    .catch(() => null);
}
