import type { Principal } from "@notables/auth";

export interface Bindings {
  DB: D1Database;
  MEDIA: R2Bucket;
  AUTH_ISSUER: string;
  AUTH_AUDIENCE: string;
  ALLOW_DEV_TOKENS: string;
  CORS_ORIGINS: string;
}

export interface Variables {
  principal: Principal | null;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };
