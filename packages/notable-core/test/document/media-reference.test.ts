import { describe, expect, it } from "bun:test";
import { localMediaId, localMediaSrc } from "../../src/document/media-reference";

describe("local media sources", () => {
  it("round-trips media ids", () => {
    expect(localMediaId(localMediaSrc("abc-123"))).toBe("abc-123");
  });

  it("ignores other URLs and empty ids", () => {
    expect(localMediaId("https://x.test/a.m4a")).toBeNull();
    expect(localMediaId("media:")).toBeNull();
  });
});
