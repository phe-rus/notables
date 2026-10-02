import { createFileRoute } from "@tanstack/react-router";

async function serve(request: Request, path: string | undefined) {
  const [{ env }, { serveModelFile }] = await Promise.all([
    import("cloudflare:workers"),
    import("../../server/models/model-files"),
  ]);
  return serveModelFile(request, env.MEDIA, path ?? "");
}

/** Voice and transcription model files the native apps download, from R2. */
export const Route = createFileRoute("/models/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => serve(request, params._splat),
      HEAD: ({ request, params }) => serve(request, params._splat),
    },
  },
});
