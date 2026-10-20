import { describe, expect, it } from "bun:test";
import { suggestCardFields } from "@/features/wallet/lib/card-fields";
import { backMatchesCard } from "@/features/wallet/model/card-back";

describe("back capture identity", () => {
  it("rejects a different utility meter even when the kind matches", () => {
    expect(
      backMatchesCard(
        "electricity",
        { number: "", meter: "00123456789", account: "" },
        suggestCardFields("UMEME\nMeter: 00987654321"),
      ),
    ).toBe(false);
  });
  it("accepts matching identifiers with printed separators", () => {
    expect(
      backMatchesCard(
        "electricity",
        { number: "", meter: "001 2345 6789", account: "" },
        suggestCardFields("UMEME\nMeter: 00123456789"),
      ),
    ).toBe(true);
  });
  it("accepts a security-code back with no printed card type", () => {
    expect(
      backMatchesCard(
        "bank",
        { number: "4111111111111111", meter: "", account: "" },
        suggestCardFields("CVV: 123"),
      ),
    ).toBe(true);
  });
  it("rejects a different document type", () => {
    expect(
      backMatchesCard(
        "passport",
        { number: "", meter: "", account: "" },
        suggestCardFields("NATIONAL IDENTITY CARD\nNIN: CM00123456"),
      ),
    ).toBe(false);
  });
});
