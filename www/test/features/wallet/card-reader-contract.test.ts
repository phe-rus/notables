import { describe, expect, it } from "bun:test";
import { nativeCardTextSchema } from "@/features/wallet/model/card-reader-contract";

describe("native card reader response contract", () => {
  it("accepts bounded OCR text with fractional percentage confidence", () => {
    expect(
      nativeCardTextSchema.parse({ text: "TEST CARD\n00123456789", confidence: 87.5 }),
    ).toEqual({ text: "TEST CARD\n00123456789", confidence: 87.5 });
    expect(nativeCardTextSchema.parse({ text: "", confidence: 0 }).text).toBe("");
  });
  it("rejects malformed, oversized or non-finite native payloads", () => {
    for (const value of [
      null,
      {},
      { text: [], confidence: 90 },
      { text: "card", confidence: "90" },
      { text: "card", confidence: -1 },
      { text: "card", confidence: 101 },
      { text: "card", confidence: Number.NaN },
      { text: "card", confidence: Number.POSITIVE_INFINITY },
      { text: "x".repeat(20_001), confidence: 80 },
      { text: "card", confidence: 80, image: "unexpected-image" },
    ]) {
      expect(nativeCardTextSchema.safeParse(value).success).toBe(false);
    }
  });
});
