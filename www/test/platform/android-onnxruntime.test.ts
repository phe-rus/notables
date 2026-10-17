import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readOnnxArchive } from "../../../scripts/android/onnxruntime";

test("a first ONNX download hashes the downloaded bytes and reuses the cached archive", async () => {
  const directory = await mkdtemp(join(tmpdir(), "notables-onnx-"));
  const path = join(directory, "runtime.aar");
  const bytes = new Uint8Array([80, 75, 3, 4, 1, 2, 3, 4]);
  let requests = 0;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch() {
      requests++;
      return new Response(bytes);
    },
  });
  try {
    const first = await readOnnxArchive(path, server.url.href);
    expect(first).toEqual(bytes);
    expect(createHash("sha256").update(first).digest("hex")).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect(await readOnnxArchive(path, server.url.href)).toEqual(bytes);
    expect(requests).toBe(1);
  } finally {
    server.stop(true);
    await rm(directory, { recursive: true, force: true });
  }
});
