import { describe, expect, it } from "bun:test";
import { layoutDay } from "../../../src/features/calendar/lib/day-layout";

const at = (key: string, start: number, end: number) => ({ key, start, end });
const columns = (blocks: ReturnType<typeof layoutDay>) =>
  Object.fromEntries(blocks.map((block) => [block.key, [block.column, block.columns]]));

describe("day layout", () => {
  it("gives a lone event the whole width", () => {
    expect(columns(layoutDay([at("a", 540, 600)]))).toEqual({ a: [0, 1] });
  });

  it("puts overlapping events side by side", () => {
    expect(columns(layoutDay([at("a", 540, 660), at("b", 600, 720)]))).toEqual({
      a: [0, 2],
      b: [1, 2],
    });
  });

  it("reuses a column once it is free again", () => {
    const placed = layoutDay([at("a", 540, 600), at("b", 550, 700), at("c", 610, 650)]);
    expect(columns(placed)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] });
  });

  it("starts afresh after a gap", () => {
    const placed = layoutDay([at("a", 540, 600), at("b", 560, 620), at("c", 700, 760)]);
    expect(columns(placed)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] });
  });

  it("treats back-to-back events as not overlapping", () => {
    expect(columns(layoutDay([at("a", 540, 600), at("b", 600, 660)]))).toEqual({
      a: [0, 1],
      b: [0, 1],
    });
  });
});
