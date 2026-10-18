import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const archive = process.argv[2];
const sdk = process.argv[3];
if (!archive || !sdk) throw new Error("Provide an APK or AAB and the Android SDK directory");
const registrars = [
  "com/google/mlkit/common/internal/CommonComponentRegistrar",
  "com/google/mlkit/vision/common/internal/VisionCommonRegistrar",
  "com/google/mlkit/vision/text/internal/TextRegistrar",
];
const found = new Set<string>();
const folder = mkdtempSync(join(tmpdir(), "notables-release-dex-"));
try {
  const entries = execFileSync("unzip", ["-Z1", resolve(archive)], { encoding: "utf8" })
    .split("\n")
    .filter((entry) => /(^|\/)classes\d*\.dex$/.test(entry));
  if (!entries.length) throw new Error("No packaged DEX found");
  for (const [index, entry] of entries.entries()) {
    const dex = join(folder, `${index}.dex`);
    writeFileSync(
      dex,
      execFileSync("unzip", ["-p", resolve(archive), entry], { maxBuffer: 64 * 1024 * 1024 }),
    );
    const output = execFileSync(join(sdk, "build-tools", "37.0.0", "dexdump"), ["-d", dex], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    for (const registrar of registrars) {
      const start = output.indexOf(`Class descriptor  : 'L${registrar};'`);
      if (start < 0) continue;
      const next = output.indexOf("Class descriptor", start + 1);
      const block = output.slice(start, next < 0 ? undefined : next);
      if (!/name\s*: '<init>'\s+type\s*: '\(\)V'\s+access\s*:.*PUBLIC CONSTRUCTOR/.test(block))
        throw new Error(`Missing reflection constructor: ${registrar}`);
      found.add(registrar);
    }
  }
  if (found.size !== registrars.length) throw new Error("Missing ML Kit registration classes");
  console.log(`Verified ${found.size} ML Kit reflection constructors in the release package`);
} finally {
  rmSync(folder, { recursive: true, force: true });
}
