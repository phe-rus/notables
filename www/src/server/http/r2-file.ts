import { contentRange, parseRange, resolveRange } from "./byte-range";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves one R2 object for GET or HEAD, with byte ranges (for audio seeking
 * and resumable downloads), `ETag`, and an optional `Cache-Control`.
 */
export async function serveR2File(
  request: Request,
  bucket: R2Bucket,
  key: string,
  cacheControl?: string,
): Promise<Response> {
  const isHead = request.method === "HEAD";
  const wanted = parseRange(request.headers.get("Range"));
  const headers = new Headers({ "Accept-Ranges": "bytes" });
  const describe = (object: R2Object) => {
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    if (cacheControl) headers.set("Cache-Control", cacheControl);
  };

  // A plain GET reads metadata and body in one call.
  if (!isHead && !wanted) {
    const object = await bucket.get(key);
    if (!object) return notFound();
    describe(object);
    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { headers });
  }

  // HEAD and ranges need the size first.
  const meta = await bucket.head(key);
  if (!meta) return notFound();
  const range = wanted && resolveRange(wanted, meta.size);
  if (range === null) {
    headers.set("Content-Range", `bytes */${meta.size}`);
    return new Response(null, { status: 416, headers });
  }
  describe(meta);
  if (!range) {
    headers.set("Content-Length", String(meta.size));
    return new Response(null, { headers });
  }
  headers.set("Content-Range", contentRange(range, meta.size));
  headers.set("Content-Length", String(range.length));
  if (isHead) return new Response(null, { status: 206, headers });
  const object = await bucket.get(key, { range });
  if (!object) return notFound();
  return new Response(object.body, { status: 206, headers });
}
