import { describe, expect, it } from "bun:test";
import { measurePage } from "@/features/books/reader/page-geometry";

describe("reading geometry", () => {
  it("uses the available reading surface on a narrow phone", () => {
    const page = measurePage(360, 674);
    expect(page.spread).toBe(false);
    expect(page.pageWidth).toBe(360);
    expect(page.pageHeight).toBe(674);
    expect(page.textWidth).toBeLessThan(page.pageWidth);
    expect(page.textHeight).toBeLessThan(page.pageHeight);
  });

  it("retains two bounded pages in a wide reading window", () => {
    const page = measurePage(1180, 740);
    expect(page.spread).toBe(true);
    expect(page.pageWidth * 2).toBeLessThan(1180);
    expect(page.pageHeight).toBeLessThan(740);
  });
});
