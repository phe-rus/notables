import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTokenVerifier, readBearerToken } from "../src";

const ISSUER = "https://account.example.test";

async function mockProvider() {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256" };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({ issuer: ISSUER, jwks_uri: `${ISSUER}/jwks` });
      }
      if (url.endsWith("/jwks")) return Response.json({ keys: [jwk] });
      return new Response("not found", { status: 404 });
    }),
  );

  return (claims: { sub: string; aud?: string; iss?: string }) =>
    new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: "k1" })
      .setSubject(claims.sub)
      .setIssuer(claims.iss ?? ISSUER)
      .setAudience(claims.aud ?? "notables")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
}

afterEach(() => vi.unstubAllGlobals());

describe("createTokenVerifier", () => {
  it("accepts tokens signed by the issuer", async () => {
    const sign = await mockProvider();
    const verify = createTokenVerifier({ issuer: ISSUER, audience: "notables" });
    await expect(verify(await sign({ sub: "acct_42" }))).resolves.toEqual({
      accountId: "acct_42",
    });
  });

  it("rejects the wrong audience or issuer", async () => {
    const sign = await mockProvider();
    const verify = createTokenVerifier({ issuer: ISSUER, audience: "notables" });
    await expect(verify(await sign({ sub: "a", aud: "other" }))).resolves.toBeNull();
    await expect(verify(await sign({ sub: "a", iss: "https://evil.test" }))).resolves.toBeNull();
  });

  it("only accepts dev tokens when explicitly allowed", async () => {
    await expect(createTokenVerifier({ allowDevTokens: true })("dev.alice")).resolves.toEqual({
      accountId: "alice",
    });
    await expect(createTokenVerifier({ issuer: ISSUER })("dev.alice")).resolves.toBeNull();
  });

  it("rejects missing and malformed tokens", async () => {
    await mockProvider();
    const verify = createTokenVerifier({ issuer: ISSUER });
    await expect(verify(null)).resolves.toBeNull();
    await expect(verify("not-a-jwt")).resolves.toBeNull();
  });
});

describe("readBearerToken", () => {
  it("prefers the Authorization header", () => {
    const request = new Request("https://x.test/?token=q", {
      headers: { Authorization: "Bearer h" },
    });
    expect(readBearerToken(request)).toBe("h");
  });

  it("falls back to the token query parameter", () => {
    expect(readBearerToken(new Request("https://x.test/?token=q"))).toBe("q");
    expect(readBearerToken(new Request("https://x.test/"))).toBeNull();
  });
});
