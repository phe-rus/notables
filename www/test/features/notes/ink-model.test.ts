import { describe, expect, it } from "bun:test";
import {
  type InkStroke,
  inkBottom,
  pushPoint,
  strokeHit,
  strokePath,
} from "../../../../packages/pluraliti/src/nodes/ink/ink-model";

const line = (): InkStroke => {
  const stroke: InkStroke = { tool: "pen", color: "ink", size: 5, points: [] };
  for (let x = 100; x <= 300; x += 20) pushPoint(stroke.points, x, 200.04, 0.6);
  return stroke;
};

describe("ink model", () => {
  it("stores points rounded, three numbers each", () => {
    const stroke = line();
    expect(stroke.points.length % 3).toBe(0);
    expect(stroke.points[1]).toBe(200);
  });

  it("draws a closed outline", () => {
    expect(strokePath(line())).toMatch(/^M[\d.]+ [\d.]+ Q.+Z$/);
  });

  it("finds strokes under the eraser", () => {
    expect(strokeHit(line(), 200, 205, 6)).toBe(true);
    expect(strokeHit(line(), 200, 260, 6)).toBe(false);
  });

  it("knows how far down the writing goes", () => {
    expect(inkBottom([line()])).toBe(205);
    expect(inkBottom([])).toBe(0);
  });
});
