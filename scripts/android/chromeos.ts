/** Native ChromeOS Android build, without ARM translation or dropping on-device voice. */
import { resolve } from "node:path";
import { prepareOnnxRuntime } from "./onnxruntime";

const www = resolve(import.meta.dir, "../../www");
const ort = await prepareOnnxRuntime(["x86_64"]);

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
  { ...process.env, ...ort },
);
