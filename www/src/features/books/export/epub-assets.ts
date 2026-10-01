import { localMediaId } from "@notables/core";

export interface EpubAsset {
  /** Path inside the package, relative to OEBPS/. */
  path: string;
  mediaType: string;
  bytes: Uint8Array;
}

export type LoadMedia = (mediaId: string) => Promise<Blob | null>;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

/**
 * EPUB 3.3 core media types: reading systems must support these, so they
 * are embedded. Anything else would need a fallback and is left out.
 */
const CORE_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
]);

const baseType = (type: string) =>
  type.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";

function decodeDataUrl(src: string): { mediaType: string; bytes: Uint8Array } | null {
  const match = src.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/);
  if (!match?.[1] || match[2] === undefined) return null;
  return {
    mediaType: baseType(match[1]),
    bytes: Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)),
  };
}

/**
 * Collects the photos and recordings a set of documents use, packaging
 * device media and data URLs as files and rewriting each source to the
 * packaged path. Remote URLs are kept, and each document reports whether
 * it uses any (EPUB marks those files with `remote-resources`).
 */
export async function packageDocumentMedia(documents: unknown[], loadMedia: LoadMedia) {
  const assets: EpubAsset[] = [];
  const pathsBySource = new Map<string, string | null>();
  let usesRemote = false;

  async function packaged(src: string): Promise<string | null> {
    if (pathsBySource.has(src)) return pathsBySource.get(src) ?? null;
    let file: { mediaType: string; bytes: Uint8Array } | null = null;
    const mediaId = localMediaId(src);
    if (mediaId) {
      const blob = await loadMedia(mediaId);
      if (blob)
        file = { mediaType: baseType(blob.type), bytes: new Uint8Array(await blob.arrayBuffer()) };
    } else if (src.startsWith("data:")) {
      file = decodeDataUrl(src);
    }
    if (!file || !CORE_MEDIA_TYPES.has(file.mediaType)) {
      pathsBySource.set(src, null);
      return null;
    }
    const path = `media/file-${assets.length + 1}.${EXTENSIONS[file.mediaType] ?? "bin"}`;
    assets.push({ path, ...file });
    pathsBySource.set(src, path);
    return path;
  }

  async function rewrite(node: unknown): Promise<unknown> {
    if (Array.isArray(node)) return Promise.all(node.map(rewrite));
    if (!node || typeof node !== "object") return node;
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "src" && typeof value === "string") {
        if (/^https?:/i.test(value)) {
          usesRemote = true;
          copy[key] = value;
        } else {
          copy[key] = (await packaged(value)) ?? "";
        }
      } else {
        copy[key] = await rewrite(value);
      }
    }
    return copy;
  }

  const packagedDocuments: Array<{ document: unknown; usesRemoteResources: boolean }> = [];
  for (const document of documents) {
    usesRemote = false;
    packagedDocuments.push({ document: await rewrite(document), usesRemoteResources: usesRemote });
  }
  return { documents: packagedDocuments, assets };
}
