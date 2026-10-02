import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { getPlatformProxy } from "wrangler";
import { parseRange, resolveRange } from "../../src/server/http/byte-range";
import { modelKey, serveModelFile } from "../../src/server/models/model-files";

describe("byte ranges", () => {
  it("parses the three single range forms", () => {
    expect(parseRange("bytes=2-4")).toEqual({ start: 2, end: 4 });
    expect(parseRange("bytes=2-")).toEqual({ start: 2 });
    expect(parseRange("bytes=-3")).toEqual({ suffix: 3 });
  });

  it("ignores ranges it can't honour, so the whole file is served", () => {
    for (const header of [null, "", "bytes=-", "bytes=4-2", "bytes=0-1,4-5", "items=0-1"]) {
      expect(parseRange(header)).toBeUndefined();
    }
  });

  it("resolves against the size, clamping the end", () => {
    expect(resolveRange({ start: 2, end: 99 }, 10)).toEqual({ offset: 2, length: 8 });
    expect(resolveRange({ suffix: 3 }, 10)).toEqual({ offset: 7, length: 3 });
    expect(resolveRange({ suffix: 30 }, 10)).toEqual({ offset: 0, length: 10 });
    expect(resolveRange({ start: 10 }, 10)).toBeNull();
    expect(resolveRange({ suffix: 0 }, 10)).toBeNull();
  });
});

describe("model paths", () => {
  it("keeps every path inside models/", () => {
    expect(modelKey("manifest.json")).toBe("models/manifest.json");
    expect(modelKey("supertonic-3/2026.10.1/onnx/vocoder.onnx")).toBe(
      "models/supertonic-3/2026.10.1/onnx/vocoder.onnx",
    );
    for (const path of ["", "../wrangler.jsonc", "a/../../b", "./x", "a//b", "a\\b", "a/\u0000"]) {
      expect(modelKey(path)).toBeNull();
    }
  });
});

/**
 * The platform proxy's R2 bodies live in another process and can't be handed
 * to a Bun `Response`; this copies each (text) body into a local stream.
 */
function localBodies(remote: R2Bucket): R2Bucket {
  const bucket = {
    head: (key: string) => remote.head(key),
    async get(key: string, options?: R2GetOptions) {
      const object = await (options ? remote.get(key, options) : remote.get(key));
      if (!object) return null;
      const text = await object.text();
      return {
        size: object.size,
        httpEtag: object.httpEtag,
        body: new Blob([text]).stream(),
        writeHttpMetadata: (headers: Headers) => object.writeHttpMetadata(headers),
      };
    },
  };
  return bucket as unknown as R2Bucket;
}

describe("model file route", () => {
  let proxy: Awaited<ReturnType<typeof getPlatformProxy<Cloudflare.Env>>>;
  let bucket: R2Bucket;
  const file = "test-pack/1/file.bin";
  const body = "0123456789";
  const get = (path: string, headers?: HeadersInit, method = "GET") =>
    serveModelFile(
      new Request(`https://notables.test/models/${path}`, { method, headers }),
      bucket,
      path,
    );

  beforeAll(async () => {
    proxy = await getPlatformProxy<Cloudflare.Env>({ persist: false });
    await proxy.env.MEDIA.put(`models/${file}`, body);
    await proxy.env.MEDIA.put("models/manifest.json", "{}");
    await proxy.env.MEDIA.put("publications/secret.json", "private");
    bucket = localBodies(proxy.env.MEDIA);
  }, 60_000);

  afterAll(() => proxy?.dispose());

  it("serves a whole file with a long cache, and the manifest with a short one", async () => {
    const response = await get(file);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(body);
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(response.headers.get("ETag")).toBeTruthy();
    expect((await get("manifest.json")).headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("serves ranges, including suffix ranges", async () => {
    const middle = await get(file, { Range: "bytes=2-4" });
    expect(middle.status).toBe(206);
    expect(middle.headers.get("Content-Range")).toBe("bytes 2-4/10");
    expect(await middle.text()).toBe("234");

    const tail = await get(file, { Range: "bytes=-3" });
    expect(tail.status).toBe(206);
    expect(tail.headers.get("Content-Range")).toBe("bytes 7-9/10");
    expect(await tail.text()).toBe("789");
  });

  it("answers 416 for a range past the end", async () => {
    const response = await get(file, { Range: "bytes=999999999-" });
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */10");
  });

  it("answers HEAD with headers and no body", async () => {
    const response = await get(file, undefined, "HEAD");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe("10");
    expect(response.body).toBeNull();
  });

  it("never reaches outside models/", async () => {
    expect((await get("../publications/secret.json")).status).toBe(404);
    expect((await get("missing.bin")).status).toBe(404);
  });
});
