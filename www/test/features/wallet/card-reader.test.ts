import { describe, expect, it } from "bun:test";
import {
  type CardReading,
  createCardStability,
} from "../../../src/features/wallet/lib/card-reader";
import { suggestCardFields } from "../../../src/features/wallet/lib/card-recognition";

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
    expect(stable(reading("TEST BANK\n0012 3456 7890 5678"))).toBe(false);
    const card = reading("TEST BANK\n0012 3456 7890 5678\n12/29\nJANE EXAMPLE");
    expect(stable(card)).toBe(false);
    expect(stable(card)).toBe(true);
  });
});
