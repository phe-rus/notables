import { localMediaId } from "@notables/core";

/** Media files uploaded with a publication (recordings and photos). */
export interface PublicationMediaUpload {
  /** The id the private note uses (`media:<id>`). */
  id: string;
  contentType: string;
  /** Base64-encoded file. */
  data: string;
}

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export const mediaPrefix = (publicationId: string) => `publications/${publicationId}/media/`;
export const mediaKey = (publicationId: string, mediaId: string) =>
  `${mediaPrefix(publicationId)}${mediaId}`;

/** Public, same-origin URL of a published media file. */
export const publicMediaPath = (publicationId: string, mediaId: string) =>
  `/media/${publicationId}/${mediaId}`;

/**
 * Points every `media:<id>` source in a serialized document at the
 * publication's public media route.
 */
export function rewriteMediaSources(document: unknown, publicationId: string): unknown {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== "object") return node;
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      const mediaId = key === "src" && typeof value === "string" ? localMediaId(value) : null;
      copy[key] = mediaId ? publicMediaPath(publicationId, mediaId) : visit(value);
    }
    return copy;
  };
  return visit(document);
}

export function decodeBase64(data: string): Uint8Array {
  return Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
}
