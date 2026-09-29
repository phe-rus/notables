import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

export interface Principal {
  /** The OIDC `sub` claim — the account id across Notables. */
  accountId: string;
}

export interface AuthConfig {
  /** OIDC issuer, e.g. `https://account.pherus.org`. */
  issuer?: string;
  /** Expected `aud` claim; typically the Notables client id. */
  audience?: string;
  /**
   * Accept `dev.<accountId>` tokens without verification. Only ever enable
   * for local development — never in a deployed environment.
   */
  allowDevTokens?: boolean;
}

export type TokenVerifier = (token: string | null | undefined) => Promise<Principal | null>;

const DEV_PREFIX = "dev.";

/**
 * Creates a verifier for bearer tokens. Keys are discovered through the
 * issuer's OpenID configuration and cached for the lifetime of the isolate.
 */
export function createTokenVerifier(config: AuthConfig): TokenVerifier {
  let jwks: Promise<JWTVerifyGetKey> | undefined;

  const keys = () => {
    if (!config.issuer) throw new Error("AUTH_ISSUER is not configured");
    jwks ??= discoverJwks(config.issuer).catch((error) => {
      jwks = undefined; // retry discovery on the next request
      throw error;
    });
    return jwks;
  };

  return async (token) => {
    if (!token) return null;

    if (token.startsWith(DEV_PREFIX)) {
      const accountId = token.slice(DEV_PREFIX.length);
      return config.allowDevTokens && accountId ? { accountId } : null;
    }

    if (!config.issuer) return null;

    try {
      const { payload } = await jwtVerify(token, await keys(), {
        issuer: config.issuer,
        ...(config.audience ? { audience: config.audience } : {}),
      });
      return payload.sub ? { accountId: payload.sub } : null;
    } catch {
      return null;
    }
  };
}

async function discoverJwks(issuer: string): Promise<JWTVerifyGetKey> {
  const url = new URL(
    ".well-known/openid-configuration",
    issuer.endsWith("/") ? issuer : `${issuer}/`,
  );
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OIDC discovery failed: ${response.status}`);
  const { jwks_uri } = (await response.json()) as { jwks_uri?: string };
  if (!jwks_uri) throw new Error("OIDC discovery response has no jwks_uri");
  return createRemoteJWKSet(new URL(jwks_uri));
}

/**
 * Reads a bearer token from the Authorization header, or from the `token`
 * query parameter for WebSocket upgrades (browsers cannot set headers).
 */
export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim() || null;
  return new URL(request.url).searchParams.get("token");
}
