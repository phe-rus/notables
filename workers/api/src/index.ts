import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "./env";
import { identify } from "./middleware";
import { publications } from "./routes/publications";

export const app = new Hono<AppEnv>()
  .use(secureHeaders())
  .use("*", (c, next) =>
    cors({
      origin: c.env.CORS_ORIGINS.split(",").map((o) => o.trim()),
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      maxAge: 86400,
    })(c, next),
  )
  .use(identify)
  .get("/health", (c) => c.json({ ok: true }))
  .route("/v1/publications", publications)
  .onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    console.error(error);
    return c.json({ error: "internal error" }, 500);
  })
  .notFound((c) => c.json({ error: "not found" }, 404));

export type ApiApp = typeof app;

export default app;
