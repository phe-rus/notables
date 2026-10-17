import { describe, expect, test } from "bun:test";
import { calculateCell, columnName } from "../../src/features/spreadsheets/lib/formulas";

describe("budget spreadsheet calculations", () => {
  test("totals ranges, references and nested arithmetic", () => {
    const cells = {
      A1: "Rent",
      B1: "500",
      B2: "80",
      B3: "=B2*2",
      B4: "=SUM(B1:B3)",
      C1: "=ROUND(AVERAGE(B1:B3),2)",
      C2: "=(B4-100)/2",
      C3: "=MAX(B1:B3)-MIN(B1:B3)",
    };
    expect(calculateCell("B4", cells)).toBe(740);
    expect(calculateCell("C1", cells)).toBe(246.67);
    expect(calculateCell("C2", cells)).toBe(320);
    expect(calculateCell("C3", cells)).toBe(420);
  });
  test("handles cycles, invalid references and division errors without executing input", () => {
    expect(calculateCell("A1", { A1: "=A2", A2: "=A1" })).toBe("#CYCLE!");
    expect(calculateCell("A1", { A1: "=1/0" })).toBe("#DIV/0!");
    expect(calculateCell("A1", { A1: "=BA1" })).toBe("#REF!");
    expect(calculateCell("A1", { A1: "=fetch('https://example.com')" })).toBe("#NAME?");
    expect(calculateCell("A1", { A1: "=(1+2" })).toBe("#FORMULA!");
    expect(calculateCell("A1", { A1: `=${"(".repeat(1000)}1` })).toBe("#LIMIT!");
  });
  test("text stays text and columns cross Z correctly", () => {
    expect(calculateCell("A1", { A1: "Groceries" })).toBe("Groceries");
    expect(calculateCell("A1", { A1: "=SUM(B1:B4)", B1: "12", B2: "label", B4: "3" })).toBe(15);
    expect(columnName(25)).toBe("Z");
    expect(columnName(26)).toBe("AA");
    expect(columnName(51)).toBe("AZ");
  });
});
