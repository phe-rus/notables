import { getStroke } from "perfect-freehand";

/**
 * Handwriting and sketches. Strokes are stored in a box 1000 units wide,
 * so writing scales with the page on any screen; height grows as people
 * write further down.
 */
export const INK_WIDTH = 1000;
export const INK_DEFAULT_HEIGHT = 360;

export type InkTool = "pen" | "marker";
/** Named colours, so ink follows light and dark themes. */
export type InkColor = "ink" | "blue" | "red" | "green" | "yellow";

export interface InkStroke {
  tool: InkTool;
  color: InkColor;
  size: number;
  /** Flat [x, y, pressure, x, y, pressure, …], rounded to keep notes small. */
  points: number[];
}

export const inkColors: InkColor[] = ["ink", "blue", "red", "green", "yellow"];

export const inkColorLabels: Record<InkColor, string> = {
  ink: "Black",
  blue: "Blue",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
};

export const toolSizes: Record<InkTool, number> = { pen: 5, marker: 22 };

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function pushPoint(points: number[], x: number, y: number, pressure: number): void {
  points.push(round(x, 1), round(y, 1), round(pressure, 2));
}

function triples(points: number[]): Array<[number, number, number]> {
  const result: Array<[number, number, number]> = [];
  for (let index = 0; index + 2 < points.length; index += 3) {
    result.push([points[index] ?? 0, points[index + 1] ?? 0, points[index + 2] ?? 0.5]);
  }
  return result;
}

/** The outline of a stroke as an SVG path, shaped by pen pressure. */
export function strokePath(stroke: InkStroke, live = false): string {
  const marker = stroke.tool === "marker";
  const outline = getStroke(triples(stroke.points), {
    size: stroke.size,
    thinning: marker ? 0 : 0.6,
    smoothing: 0.55,
    streamline: marker ? 0.6 : 0.45,
    // Mice and fingers report no real pressure; let speed stand in for it.
    simulatePressure: stroke.points.every((value, index) => index % 3 !== 2 || value === 0.5),
    last: !live,
    start: { taper: marker ? 0 : 6, cap: true },
    end: { taper: marker ? 0 : 10, cap: true },
  });
  if (outline.length < 2) return "";
  const [first, ...rest] = outline;
  const d = [`M${round(first?.[0] ?? 0, 1)} ${round(first?.[1] ?? 0, 1)}`];
  for (let index = 0; index < rest.length; index++) {
    const point = rest[index] as number[];
    const next = (rest[index + 1] ?? first) as number[];
    // Quadratic curves through midpoints give a smooth edge.
    d.push(
      `Q${round(point[0] ?? 0, 1)} ${round(point[1] ?? 0, 1)} ${round(((point[0] ?? 0) + (next[0] ?? 0)) / 2, 1)} ${round(((point[1] ?? 0) + (next[1] ?? 0)) / 2, 1)}`,
    );
  }
  return `${d.join(" ")}Z`;
}

/** Whether a point (in ink units) touches a stroke, for the eraser. */
export function strokeHit(stroke: InkStroke, x: number, y: number, radius: number): boolean {
  const reach = radius + stroke.size / 2;
  for (let index = 0; index + 1 < stroke.points.length; index += 3) {
    const dx = (stroke.points[index] ?? 0) - x;
    const dy = (stroke.points[index + 1] ?? 0) - y;
    if (dx * dx + dy * dy <= reach * reach) return true;
  }
  return false;
}

/** The lowest point written, so the canvas can grow ahead of the pen. */
export function inkBottom(strokes: InkStroke[]): number {
  let bottom = 0;
  for (const stroke of strokes) {
    for (let index = 1; index < stroke.points.length; index += 3) {
      bottom = Math.max(bottom, (stroke.points[index] ?? 0) + stroke.size);
    }
  }
  return bottom;
}
