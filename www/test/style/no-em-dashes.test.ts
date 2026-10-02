import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** House style: no em dashes anywhere in the app's words, code or docs. */
const ROOT = join(import.meta.dir, "../../..");
const SCAN = ["www/src", "www/test", "shared", "docs", "README.md", "CONTRIBUTING.md"];
const SKIP = new Set(["node_modules", "dist", "target", "gen", "routeTree.gen.ts"]);
const TEXT = /\.(ts|tsx|css|md|json|rs)$/;
const EM_DASH = String.fromCharCode(0x2014);

function files(path: string): string[] {
  const full = join(ROOT, path);
  if (!statSync(full, { throwIfNoEntry: false })) return [];
  if (statSync(full).isFile()) return TEXT.test(path) ? [path] : [];
  return readdirSync(full)
    .filter((name) => !SKIP.has(name))
    .flatMap((name) => files(join(path, name)));
}

describe("writing style", () => {
  it("uses no em dashes", () => {
    const offenders = SCAN.flatMap(files).filter((path) =>
      readFileSync(join(ROOT, path), "utf8").includes(EM_DASH),
    );
    expect(offenders).toEqual([]);
  });
});
