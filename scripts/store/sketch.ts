/**
 * A hand-drawn route sketch for the store screenshots. It goes into the
 * Jinja plan as ordinary ink strokes, so the editor shows real handwriting.
 */

type Point = [number, number];

export interface InkStroke {
  tool: "pen" | "marker";
  color: "ink" | "blue" | "red" | "green" | "yellow";
  size: number;
  points: number[];
}

/** A wobbly hand-drawn line through `path`, with pressure that swells and fades. */
function stroke(
  path: Point[],
  color: InkStroke["color"],
  tool: InkStroke["tool"] = "pen",
  wobble = 1.2,
): InkStroke {
  const points: number[] = [];
  const steps = path.length;
  path.forEach(([x, y], i) => {
    const t = i / Math.max(1, steps - 1);
    const pressure = 0.35 + 0.4 * Math.sin(Math.PI * t);
    points.push(
      Math.round((x + Math.sin(i * 1.7) * wobble) * 10) / 10,
      Math.round((y + Math.cos(i * 1.3) * wobble) * 10) / 10,
      Math.round(pressure * 100) / 100,
    );
  });
  return { tool, color, size: tool === "pen" ? 5 : 22, points };
}

const curve = (from: Point, to: Point, bend: number, steps = 28): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const mx = (from[0] + to[0]) / 2 - (to[1] - from[1]) * bend;
    const my = (from[1] + to[1]) / 2 + (to[0] - from[0]) * bend;
    return [
      (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * mx + t ** 2 * to[0],
      (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * my + t ** 2 * to[1],
    ];
  });

const circle = (cx: number, cy: number, r: number, turns = 1.08, steps = 40): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (i / steps) * Math.PI * 2 * turns;
    const rr = r * (1 + 0.04 * Math.sin(i));
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });

/** The route to Jinja, sketched: hills, the river, the bus road, a sun and a star. */
export function routeSketch(): { strokes: InkStroke[]; height: number } {
  const strokes: InkStroke[] = [];
  // Sun with rays.
  strokes.push(stroke(circle(860, 80, 34), "yellow", "marker", 0.5));
  strokes.push(stroke(circle(860, 80, 38), "ink"));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    strokes.push(
      stroke(
        [
          [860 + Math.cos(a) * 52, 80 + Math.sin(a) * 52],
          [860 + Math.cos(a) * 70, 80 + Math.sin(a) * 70],
        ],
        "ink",
        "pen",
        0.3,
      ),
    );
  }
  // Hills.
  strokes.push(
    stroke(
      [...curve([40, 230], [330, 210], -0.25), ...curve([330, 210], [620, 235], -0.2)],
      "green",
    ),
  );
  strokes.push(stroke(curve([520, 240], [960, 220], -0.18), "green"));
  // The Nile.
  const river: Point[] = Array.from({ length: 60 }, (_, i) => {
    const x = 40 + i * 15.5;
    return [x, 300 + Math.sin(i / 6) * 22];
  });
  strokes.push(stroke(river, "blue", "marker", 0.6));
  strokes.push(
    stroke(
      river.map(([x, y]) => [x, y + 26] as Point),
      "blue",
      "pen",
      0.8,
    ),
  );
  // The bus road, in dashes, to the source of the Nile.
  const road = curve([70, 120], [640, 270], 0.22, 48);
  for (let i = 0; i < road.length - 3; i += 5)
    strokes.push(stroke(road.slice(i, i + 3), "ink", "pen", 0.3));
  strokes.push(stroke(circle(70, 120, 10, 1.1, 20), "ink", "pen", 0.3));
  // A star where the river starts.
  const star: Point[] = Array.from({ length: 11 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? 30 : 13;
    return [660 + Math.cos(a) * r, 270 + Math.sin(a) * r];
  });
  strokes.push(stroke(star, "red", "pen", 0.4));
  strokes.push(stroke(circle(660, 270, 50, 1.12), "red"));
  return { strokes, height: 360 };
}
