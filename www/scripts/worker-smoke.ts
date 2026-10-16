/**
 * Starts the built Worker in Wrangler's local runtime and asks it for a few
 * pages. Type checks and tests never run the Worker itself, so a module that
 * breaks it (one that draws a random value at import, say) would otherwise
 * reach production unseen. Runs before every deploy; needs `vite build` first.
 */
import { spawn } from "node:child_process";

const PORT = 8790;
const PAGES = ["/", "/link", "/verify", "/models/manifest.json"];
/** A page must not fail; a missing model manifest locally is a 404, which is fine. */
const healthy = (status: number) => status < 500;

const worker = spawn("bunx", ["wrangler", "dev", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
worker.stdout.on("data", (chunk) => {
  log += chunk;
});
worker.stderr.on("data", (chunk) => {
  log += chunk;
});

async function ready(deadline: number) {
  while (Date.now() < deadline) {
    if (log.includes("Ready on")) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

let failed = false;
try {
  if (!(await ready(Date.now() + 90_000))) throw new Error("The Worker didn't start.");
  for (const page of PAGES) {
    const response = await fetch(`http://localhost:${PORT}${page}`);
    console.log(`${response.status} ${page}`);
    if (!healthy(response.status)) failed = true;
  }
} catch (error) {
  console.error(String(error));
  failed = true;
} finally {
  worker.kill();
}
if (failed) {
  console.error(log.split("\n").slice(-30).join("\n"));
  process.exit(1);
}
