import { localMediaId } from "@notables/core";
import { loadMedia } from "../../../platform/storage/media-store";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export interface MediaFile {
  path: string;
  type: string;
  bytes: Uint8Array;
}

/**
 * The pictures and recordings a book uses, read once each and given tidy
 * numbered names for packaging beside the text.
 */
export class MediaFiles {
  readonly files: MediaFile[] = [];
  #bySource = new Map<string, MediaFile | null>();

  constructor(private readonly folder = "media") {}

  async add(src: string, name?: string): Promise<MediaFile | null> {
    if (this.#bySource.has(src)) return this.#bySource.get(src) ?? null;
    const blob = await readSource(src);
    if (!blob) {
      this.#bySource.set(src, null);
      return null;
    }
    const type = blob.type.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
    const extension = EXTENSIONS[type] ?? "bin";
    const index = String(this.files.length + 1).padStart(3, "0");
    const file: MediaFile = {
      path: `${this.folder ? `${this.folder}/` : ""}${name ?? index}.${extension}`,
      type,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    };
    this.files.push(file);
    this.#bySource.set(src, file);
    return file;
  }

  /** Already-read file for a source, without reading. */
  get(src: string): MediaFile | null {
    return this.#bySource.get(src) ?? null;
  }
}

export async function readSource(src: string): Promise<Blob | null> {
  const mediaId = localMediaId(src);
  if (mediaId) return loadMedia(mediaId).catch(() => null);
  if (src.startsWith("data:") || src.startsWith("blob:") || /^https?:/i.test(src)) {
    return fetch(src)
      .then((response) => (response.ok ? response.blob() : null))
      .catch(() => null);
  }
  return null;
}

export function dataUrl(file: MediaFile): string {
  let binary = "";
  for (let i = 0; i < file.bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...file.bytes.subarray(i, i + 0x8000));
  }
  return `data:${file.type};base64,${btoa(binary)}`;
}

function loadElement(blob: Blob): Promise<HTMLImageElement | null> {
  const url = URL.createObjectURL(blob);
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

/** Width SVG pages are drawn at when they don't say. */
const VECTOR_WIDTH = 1600;

/** Converts any picture the browser can show to PNG, for formats that need it. */
export async function toPng(
  file: MediaFile,
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  const blob = new Blob([file.bytes as BlobPart], { type: file.type });
  const vector = file.type === "image/svg+xml";
  // Bitmaps decode directly; SVG needs an image element.
  const source: ImageBitmap | HTMLImageElement | null = vector
    ? await loadElement(blob)
    : await createImageBitmap(blob).catch(() => loadElement(blob));
  if (!source) return null;
  const naturalWidth = source.width || VECTOR_WIDTH;
  const naturalHeight = source.height || VECTOR_WIDTH;
  if (!vector && (file.type === "image/png" || file.type === "image/jpeg")) {
    return { bytes: file.bytes, width: naturalWidth, height: naturalHeight };
  }
  const scale = vector ? VECTOR_WIDTH / naturalWidth : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(naturalWidth * scale);
  canvas.height = Math.round(naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return png
    ? { bytes: new Uint8Array(await png.arrayBuffer()), width: canvas.width, height: canvas.height }
    : null;
}
