import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dark, light, renderThemeCss } from "../src";

/** WCAG relative luminance contrast ratio between two hex colors. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("design tokens", () => {
  it("defines every color role in both schemes", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  for (const [name, scheme] of Object.entries({ light, dark })) {
    it(`keeps text readable in ${name} mode (WCAG AA)`, () => {
      for (const ground of [scheme.background, scheme.surface, scheme.paper, scheme.sidebar]) {
        expect(contrast(scheme.label, ground)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(scheme.labelSecondary, ground)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(scheme.accentText, ground)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(scheme.onAccent, scheme.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(scheme.onInverse, scheme.inverse)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("keeps theme.css in sync with the source tokens", () => {
    const committed = readFileSync(new URL("../theme.css", import.meta.url), "utf8");
    expect(committed).toBe(renderThemeCss());
  });
});
