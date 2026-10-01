import { createTokenVerifier, readBearerToken } from "@notables/auth";
import { routePartykitRequest } from "partyserver";
import { ACCOUNT_HEADER, type Env } from "./env";

export { NoteDocument } from "./note-document";

/**
 * Authenticates every request, then forwards it to the note's Durable Object
 * at `/parties/note-document/:noteId` with the verified account id attached.
 */
async function authenticate(request: Request, env: Env): Promise<Request | Response> {
  const verify = createTokenVerifier({
    issuer: env.AUTH_ISSUER || undefined,
    audience: env.AUTH_AUDIENCE || undefined,
    allowDevTokens: env.ALLOW_DEV_TOKENS === "true",
  });

  const principal = await verify(readBearerToken(request));
  if (!principal) return new Response("unauthorized", { status: 401 });

  // Never trust a client-supplied identity header.
  const headers = new Headers(request.headers);
  headers.set(ACCOUNT_HEADER, principal.accountId);
  return new Request(request, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true });

    const routed = await routePartykitRequest(request, env as unknown as Record<string, unknown>, {
      onBeforeConnect: (req) => authenticate(req, env),
      onBeforeRequest: (req) => authenticate(req, env),
    });
    return routed ?? new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
