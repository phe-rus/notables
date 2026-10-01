import { describe, expect, it } from "bun:test";
import { createId, isId } from "../../src/identity/uuid-v7";

describe("createId", () => {
  it("produces valid UUIDv7 strings", () => {
    const id = createId();
    expect(isId(id)).toBe(true);
    expect(id[14]).toBe("7");
  });

  it("sorts by creation time", () => {
    const earlier = createId(1_700_000_000_000);
    const later = createId(1_700_000_000_001);
    expect(earlier < later).toBe(true);
  });

  it("is unique", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId(0)));
    expect(ids.size).toBe(1000);
  });
});
