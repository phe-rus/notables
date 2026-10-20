import { describe, expect, it } from "bun:test";
import { suggestCardFields } from "@/features/wallet/lib/card-recognition";
import { createCardStability } from "@/features/wallet/lib/create-card-stability";
import { hasCardDetails } from "@/features/wallet/model/has-card-details";
import type { CardReading } from "@/features/wallet/model/types";

const reading = (text: string, confidence = 95): CardReading => ({
  text,
  confidence,
  suggestions: suggestCardFields(text),
});

describe("automatic wallet capture", () => {
  it("requires two independent clear frames agreeing on the details", () => {
    const stable = createCardStability();
    const card = reading("UMEME\nMeter No 00123456789");
    expect(stable(card)).toBe(false);
    expect(stable(card)).toBe(true);
  });
  it("does not capture blank frames or unrelated text", () => {
    const stable = createCardStability();
    expect(stable(reading(""))).toBe(false);
    expect(stable(reading("DESK\nKEYBOARD"))).toBe(false);
    expect(stable(reading("1234567890123456"))).toBe(false);
    expect(stable(reading("1234567890123456"))).toBe(false);
    expect(stable(reading("DESK\nKEYBOARD"))).toBe(false);
  });
  it("resets agreement after blurry or conflicting frames", () => {
    const stable = createCardStability();
    const card = reading("UMEME\nMeter No 00123456789");
    expect(stable(card)).toBe(false);
    expect(stable({ ...card, confidence: 20 })).toBe(false);
    expect(stable(card)).toBe(false);
    expect(stable(reading("UMEME\nMeter No 00123456780"))).toBe(false);
    expect(stable(card)).toBe(false);
    expect(stable(card)).toBe(true);
  });
  it("waits for expiry and holder changes to settle", () => {
    const stable = createCardStability();
    expect(stable(reading("TEST BANK\n4111 1111 1111 1111"))).toBe(false);
    const card = reading("TEST BANK\n4111 1111 1111 1111\n12/29\nJANE EXAMPLE");
    expect(stable(card)).toBe(false);
    expect(stable(card)).toBe(true);
  });
});

it("prefers a useful rotated reading over confident unrelated text", async () => {
  const { cardReadingStrength } = await import("@/features/wallet/model/card-reading-strength");
  const { suggestCardFields } = await import("@/features/wallet/lib/card-fields");
  const reading = (text: string, confidence: number) => ({
    text,
    confidence,
    suggestions: suggestCardFields(text),
  });
  expect(cardReadingStrength(reading("UMEME\n00123456789", 78))).toBeGreaterThan(
    cardReadingStrength(reading("UNRELATED TEXT", 99)),
  );
  expect(cardReadingStrength(reading("UMEME\n00123456789", 78))).toBeGreaterThan(
    cardReadingStrength(reading("NIN", 79)),
  );
});

it("does not automatically accept a repeatedly incomplete bank number", () => {
  const stable = createCardStability();
  const card = reading("VISA\n111 1111 1111 1111\n12/29");
  expect(stable(card)).toBe(false);
  expect(stable(card)).toBe(false);
});

it("keeps logo-only manual captures out of an empty Wallet review", () => {
  expect(hasCardDetails(reading("VISA\nCONTACTLESS"))).toBe(false);
  expect(hasCardDetails(reading("DESK\nKEYBOARD"))).toBe(false);
  expect(hasCardDetails(reading("TEST BANK\n4111 1111 1111 1111\n12/29"))).toBe(true);
  expect(hasCardDetails(reading("UMEME\nMeter No 00123456789"))).toBe(true);
});
