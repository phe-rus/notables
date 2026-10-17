/** Native ChromeOS Android build, without ARM translation or dropping on-device voice. */
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const www = resolve(root, "www");
const cache = resolve(www, "src-tauri/target/chromeos-ort");
const version = "1.28.0";
const digest = "f351a0638696f54b35184290dbc001d66daae17281ad0b548d2c70347d53b8a9";
const archive = Bun.file(resolve(cache, `onnxruntime-${version}.aar`));
await mkdir(cache, { recursive: true });
if (!(await archive.exists())) {
  const response = await fetch(
    `https://repo.maven.apache.org/maven2/com/microsoft/onnxruntime/onnxruntime-android/${version}/onnxruntime-android-${version}.aar`,
  );
  if (!response.ok) throw new Error(`ONNX Runtime download failed: ${response.status}`);
  await Bun.write(archive, await response.arrayBuffer());
}
if (
  createHash("sha256")
    .update(new Uint8Array(await archive.arrayBuffer()))
    .digest("hex") !== digest
)
  throw new Error("ONNX Runtime archive checksum mismatch");
const extract = Bun.spawn(["unzip", "-p", archive.name, "jni/x86_64/libonnxruntime.so"], {
  stdout: "pipe",
  stderr: "inherit",
});
const library = await new Response(extract.stdout).arrayBuffer();
if ((await extract.exited) !== 0 || !library.byteLength)
  throw new Error("ONNX Runtime extraction failed");
await Bun.write(resolve(cache, "libonnxruntime.so"), library);
const jni = resolve(www, "src-tauri/gen/android/app/src/main/jniLibs/x86_64");
await mkdir(jni, { recursive: true });
await Bun.write(resolve(jni, "libonnxruntime.so"), library);

async function run(command: string[], env = process.env) {
  const child = Bun.spawn(command, {
    cwd: www,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0) process.exit(code);
}
await run(["bun", "run", "build"], { ...process.env, TAURI_ENV_PLATFORM: "linux" });
await run(
  [
    "bun",
    "run",
    "tauri",
    "android",
    "build",
    "--debug",
    "--apk",
    "--target",
    "x86_64",
    "--config",
    JSON.stringify({ build: { beforeBuildCommand: "" } }),
  ],
  {
    ...process.env,
    ORT_LIB_PATH: cache,
    ORT_PREFER_DYNAMIC_LINK: "1",
  },
);
