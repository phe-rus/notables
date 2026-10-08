import { describe, expect, it } from "bun:test";
import { sanitizeUrl } from "../../src/lib/sanitize-url";

describe("sanitizeUrl", () => {
  it("adds https to bare domains", () => {
    expect(sanitizeUrl("pherus.org")).toBe("https://pherus.org/");
  });

  it("keeps safe protocols", () => {
    expect(sanitizeUrl("mailto:hi@pherus.org")).toBe("mailto:hi@pherus.org");
    expect(sanitizeUrl("https://x.test/a?b=1")).toBe("https://x.test/a?b=1");
  });

  it("rejects script and data URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("data:text/html,hi")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
  });
});
