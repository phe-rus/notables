/**
 * Publishes a model pack to R2: `bun run models:publish <pack-id>`.
 *
 * Downloads the pinned upstream files, checksums them, uploads them to
 * `models/<id>/<version>/` and writes `models/manifest.json` last, so the
 * apps never see a pack whose files are not all in place. Uses the wrangler
 * login (always `--remote`); files over 300 MB go through R2's S3 API with
 * multipart upload, which needs R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and
 * R2_ACCOUNT_ID in the environment.
 */
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PACKS, type PackSource } from "./packs";

const MODELS_BASE_URL = "https://notables.pherus.org/models";
const MULTIPART_THRESHOLD = 300 * 1024 * 1024;
const ROOT = join(import.meta.dir, "..", "..");
const WWW = join(ROOT, "www");
const CACHE = join(ROOT, ".models-cache");

interface ManifestFile {
  path: string;
  bytes: number;
  sha256: string;
}

interface Manifest {
  schema: 1;
  packs: Record<string, unknown>[];
}

/** The R2 bucket behind the `MEDIA` binding in wrangler.jsonc. */
async function bucketName(): Promise<string> {
  const text = await Bun.file(join(WWW, "wrangler.jsonc")).text();
  const config = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""));
  const bucket = config.r2_buckets?.find((b: { binding: string }) => b.binding === "MEDIA");
  if (!bucket) throw new Error("No MEDIA bucket in wrangler.jsonc");
  return bucket.bucket_name;
}

async function sha256(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  for await (const chunk of Bun.file(path).stream()) hasher.update(chunk);
  return hasher.digest("hex");
}

/** Downloads one upstream file into the local cache, reusing a finished copy. */
async function fetchUpstream(pack: PackSource, from: string, to: string): Promise<string> {
  const target = join(CACHE, pack.id, pack.version, to);
  const url = `https://huggingface.co/${pack.upstream.repo}/resolve/${pack.upstream.revision}/${from}`;
  const head = await fetch(url, { method: "HEAD", redirect: "follow" });
  if (!head.ok) throw new Error(`${url}: ${head.status}`);
  const size = Number(head.headers.get("Content-Length") ?? -1);
  const existing = await stat(target).catch(() => null);
  if (existing && existing.size === size) return target;

  console.log(`  downloading ${from}`);
  await mkdir(dirname(target), { recursive: true });
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  await Bun.write(target, response);
  return target;
}

async function run(command: string[], cwd = WWW) {
  const child = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit" });
  if ((await child.exited) !== 0) throw new Error(`Failed: ${command.join(" ")}`);
}

async function upload(bucket: string, key: string, file: string, contentType: string) {
  const { size } = await stat(file);
  if (size <= MULTIPART_THRESHOLD) {
    const target = `${bucket}/${key}`;
    await run(["bunx", "wrangler", "r2", "object", "put", target, "--file", file, "--remote"]);
    return;
  }
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
    throw new Error(
      `${key} is over 300 MB: set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID`,
    );
  }
  const s3 = new Bun.S3Client({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    bucket,
  });
  // Bun splits large writes into a multipart upload.
  await s3.write(key, Bun.file(file), { type: contentType });
}

const contentTypeOf = (path: string) =>
  path.endsWith(".json")
    ? "application/json"
    : path.endsWith("LICENSE")
      ? "text/plain"
      : "application/octet-stream";

async function publish(pack: PackSource) {
  const bucket = await bucketName();
  const folder = `models/${pack.id}/${pack.version}`;
  const probe = await fetch(`${MODELS_BASE_URL}/${pack.id}/${pack.version}/${pack.files[0]?.to}`, {
    method: "HEAD",
  });
  if (probe.ok) throw new Error(`${folder} is already published; bump the version`);

  console.log(`Publishing ${pack.id} ${pack.version} to ${bucket}`);
  const files: ManifestFile[] = [];
  const local: { path: string; file: string }[] = [];
  for (const { from, to } of pack.files)
    local.push({ path: to, file: await fetchUpstream(pack, from, to) });
  if (pack.license.local) {
    local.push({ path: pack.license.path, file: join(import.meta.dir, pack.license.local) });
  }
  for (const { path, file } of local) {
    files.push({ path, bytes: (await stat(file)).size, sha256: await sha256(file) });
  }
  for (const { path, file } of local) {
    console.log(`  uploading ${path}`);
    await upload(bucket, `${folder}/${path}`, file, contentTypeOf(path));
  }

  const current = await fetch(`${MODELS_BASE_URL}/manifest.json`, { cache: "no-store" });
  const manifest: Manifest = current.ok ? await current.json() : { schema: 1, packs: [] };
  const entry = {
    id: pack.id,
    kind: pack.kind,
    version: pack.version,
    format: pack.format,
    ...pack.voice,
    license: { name: pack.license.name, path: pack.license.path },
    files,
  };
  manifest.packs = [...manifest.packs.filter((p) => p.id !== pack.id), entry];
  const manifestFile = join(CACHE, "manifest.json");
  await Bun.write(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("  writing manifest.json");
  await upload(bucket, "models/manifest.json", manifestFile, "application/json");
  console.log("Done.");
}

const id = process.argv[2];
const pack = PACKS.find((p) => p.id === id);
if (!pack) {
  console.error(`Usage: bun run models:publish <${PACKS.map((p) => p.id).join(" | ")}>`);
  process.exit(1);
}
await publish(pack);
