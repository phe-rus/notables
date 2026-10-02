import { serveR2File } from "../http/r2-file";

/** Everything the app downloads (voice and transcription packs) lives under this prefix. */
const MODELS_PREFIX = "models/";
const MANIFEST = "manifest.json";

/** Versioned files never change, so they cache for a year; the manifest stays fresh. */
const IMMUTABLE = "public, max-age=31536000, immutable";
const MANIFEST_CACHE = "public, max-age=300";

/**
 * The R2 key for a path under `/models/`, or null when the path could reach
 * outside the prefix: empty segments, `.` or `..`, backslashes, or control
 * characters. Paths arrive already percent decoded.
 */
export function modelKey(path: string): string | null {
  if (!path || path.includes("\\") || [...path].some((c) => c.charCodeAt(0) < 0x20)) return null;
  const segments = path.split("/");
  if (segments.some((part) => part === "" || part === "." || part === "..")) return null;
  return MODELS_PREFIX + path;
}

/** Serves a model file from the bucket, for GET and HEAD. */
export function serveModelFile(request: Request, bucket: R2Bucket, path: string) {
  const key = modelKey(path);
  if (!key) return new Response("Not found", { status: 404 });
  return serveR2File(request, bucket, key, path === MANIFEST ? MANIFEST_CACHE : IMMUTABLE);
}
