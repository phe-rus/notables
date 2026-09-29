import { createTokenVerifier, readBearerToken } from "@notables/auth";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./env";

/** Attaches the caller's principal (or null) to the context. */
export const identify = createMiddleware<AppEnv>(async (c, next) => {
  const verify = createTokenVerifier({
    issuer: c.env.AUTH_ISSUER || undefined,
    audience: c.env.AUTH_AUDIENCE || undefined,
    allowDevTokens: c.env.ALLOW_DEV_TOKENS === "true",
  });
  c.set("principal", await verify(readBearerToken(c.req.raw)));
  await next();
});

/** Rejects anonymous callers; returns the signed-in account id. */
export function requireAccount(principal: AppEnv["Variables"]["principal"]): string {
  if (!principal) throw new HTTPException(401, { message: "sign in required" });
  return principal.accountId;
}
