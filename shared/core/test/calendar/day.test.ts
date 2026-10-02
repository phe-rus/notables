import { describe, expect, it } from "bun:test";
import { addDaysTo, dayInMonth, daysBetween, daysInMonth, parseDay, weekday } from "../../src";

describe("days across the centuries", () => {
  it("keeps years below 100 as written", () => {
    expect(addDaysTo("0079-08-24", 1)).toBe("0079-08-25");
    expect(parseDay("0001-01-01").getUTCFullYear()).toBe(1);
    expect(dayInMonth(42, 1, 30)).toBe("0042-02-28");
  });

  it("counts days over long spans", () => {
    expect(daysBetween("1900-01-01", "2000-01-01")).toBe(36524);
    expect(addDaysTo("1999-12-31", 1)).toBe("2000-01-01");
    expect(addDaysTo("9999-12-30", 1)).toBe("9999-12-31");
  });

  it("knows leap years far from now", () => {
    expect(daysInMonth(1600, 1)).toBe(29);
    expect(daysInMonth(1700, 1)).toBe(28);
    expect(daysInMonth(2400, 1)).toBe(29);
  });

  it("finds weekdays in past centuries", () => {
    // 4 July 1776 was a Thursday.
    expect(weekday("1776-07-04")).toBe(4);
  });
});
