import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dark, light, renderThemeCss } from "../src/index.ts";

describe("design tokens", () => {
  it("defines every color role in both schemes", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it("keeps theme.css in sync with the source tokens", () => {
    const committed = readFileSync(new URL("../theme.css", import.meta.url), "utf8");
    expect(committed, "run `pnpm --filter @notables/design-tokens build`").toBe(renderThemeCss());
  });
});
