/** Bindings declared in wrangler.jsonc, read via `import { env } from "cloudflare:workers"`. */
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
  }
}
