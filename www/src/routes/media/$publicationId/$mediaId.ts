import { Id } from "@notables/core";
import { createFileRoute } from "@tanstack/react-router";

/** Serves recordings and photos of published notes, with byte-range support. */
export const Route = createFileRoute("/media/$publicationId/$mediaId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!Id.safeParse(params.publicationId).success || !Id.safeParse(params.mediaId).success) {
          return new Response("Not found", { status: 404 });
        }
        const [{ env }, { mediaKey }, { serveR2File }] = await Promise.all([
          import("cloudflare:workers"),
          import("../../../server/publications/publication-media"),
          import("../../../server/http/r2-file"),
        ]);
        return serveR2File(request, env.MEDIA, mediaKey(params.publicationId, params.mediaId));
      },
    },
  },
});
