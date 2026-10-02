import { describe, expect, it } from "bun:test";
import { daysLeft, isExpired } from "../../../src/features/trash/lib/retention";

const DAY = 24 * 60 * 60 * 1000;

describe("recently deleted retention", () => {
  it("counts down whole days from seven", () => {
    expect(daysLeft(0, 0)).toBe(7);
    expect(daysLeft(0, DAY * 2.5)).toBe(5);
    expect(daysLeft(0, DAY * 6.9)).toBe(1);
  });

  it("expires after a week", () => {
    expect(isExpired(0, DAY * 6.99)).toBe(false);
    expect(isExpired(0, DAY * 7)).toBe(true);
  });
});
