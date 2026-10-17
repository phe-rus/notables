/**
 * Microsoft's ONNX Runtime for Android (the checksum-pinned Maven AAR), for the
 * ABIs given (default: both). `ort` has no prebuilt for x86_64 Android, which
 * ChromeOS and many tablets need, so every Android build links this one:
 * each ABI's library goes to `<cache>/<abi>`, where `build.rs` points the
 * linker, and into the app's jniLibs.
 *
 * Prints the variables a build needs, and adds them to $GITHUB_ENV in CI.
 */
import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const www = resolve(root, "www");
export const ortCache = resolve(www, "src-tauri/target/android-ort");
const version = "1.28.0";
const digest = "f351a0638696f54b35184290dbc001d66daae17281ad0b548d2c70347d53b8a9";

export async function prepareOnnxRuntime(abis: string[]) {
  const archive = Bun.file(resolve(ortCache, `onnxruntime-${version}.aar`));
  await mkdir(ortCache, { recursive: true });
  if (!(await archive.exists())) {
    const response = await fetch(
      `https://repo.maven.apache.org/maven2/com/microsoft/onnxruntime/onnxruntime-android/${version}/onnxruntime-android-${version}.aar`,
    );
    if (!response.ok) throw new Error(`ONNX Runtime download failed: ${response.status}`);
    await Bun.write(archive, await response.arrayBuffer());
  }
  const hash = createHash("sha256")
    .update(new Uint8Array(await archive.arrayBuffer()))
    .digest("hex");
  if (hash !== digest) throw new Error("ONNX Runtime archive checksum mismatch");

  for (const abi of abis) {
    const extract = Bun.spawn(["unzip", "-p", archive.name ?? "", `jni/${abi}/libonnxruntime.so`], {
      stdout: "pipe",
      stderr: "inherit",
    });
    const library = await new Response(extract.stdout).arrayBuffer();
    if ((await extract.exited) !== 0 || !library.byteLength)
      throw new Error(`ONNX Runtime extraction failed for ${abi}`);
    await mkdir(resolve(ortCache, abi), { recursive: true });
    await Bun.write(resolve(ortCache, abi, "libonnxruntime.so"), library);
    const jni = resolve(www, "src-tauri/gen/android/app/src/main/jniLibs", abi);
    await mkdir(jni, { recursive: true });
    await Bun.write(resolve(jni, "libonnxruntime.so"), library);
  }
  return {
    // A folder with no library of its own: build.rs adds each ABI's folder.
    ORT_LIB_PATH: ortCache,
    ORT_PREFER_DYNAMIC_LINK: "1",
    NOTABLES_ORT_ANDROID: ortCache,
  };
}

if (import.meta.main) {
  const abis = process.argv.slice(2);
  const env = await prepareOnnxRuntime(abis.length ? abis : ["arm64-v8a", "x86_64"]);
  const lines = Object.entries(env).map(([name, value]) => `${name}=${value}`);
  if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
}
