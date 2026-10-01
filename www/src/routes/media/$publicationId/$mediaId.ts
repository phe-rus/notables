import { Id } from "@notables/core";
import { createFileRoute } from "@tanstack/react-router";

/** Parses a single `bytes=start-end` range (enough for audio seeking). */
function parseRange(header: string | null): R2Range | undefined {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return undefined;
  const [, start, end] = match;
  if (start)
    return end
      ? { offset: Number(start), length: Number(end) - Number(start) + 1 }
      : { offset: Number(start) };
  return end ? { suffix: Number(end) } : undefined;
}

/** Serves recordings and photos of published notes, with byte-range support. */
export const Route = createFileRoute("/media/$publicationId/$mediaId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!Id.safeParse(params.publicationId).success || !Id.safeParse(params.mediaId).success) {
          return new Response("Not found", { status: 404 });
        }
        const [{ env }, { createPublications }] = await Promise.all([
          import("cloudflare:workers"),
          import("../../../server/publications/publications.service"),
        ]);
        const range = parseRange(request.headers.get("Range"));
        const object = await createPublications(env.DB, env.MEDIA).media(
          params.publicationId,
          params.mediaId,
          range,
        );
        if (!object || !("body" in object)) return new Response("Not found", { status: 404 });

        const headers = new Headers({ "Accept-Ranges": "bytes", ETag: object.httpEtag });
        object.writeHttpMetadata(headers);
        if (range && object.range && "offset" in object.range) {
          const offset = object.range.offset ?? 0;
          const length = object.range.length ?? object.size - offset;
          headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
          headers.set("Content-Length", String(length));
          return new Response(object.body, { status: 206, headers });
        }
        headers.set("Content-Length", String(object.size));
        return new Response(object.body, { headers });
      },
    },
  },
});
