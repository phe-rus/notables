import { strokePath } from "@notables/pluraliti";
import type { BubbleFont, BubbleItem, StrokeItem } from "../model/page-scene";

export const fontFamilies: Record<BubbleFont, string> = {
  comic: '"Patrick Hand", "Comic Sans MS", system-ui, sans-serif',
  hand: '"Caveat Variable", "Caveat", cursive',
  serif: '"Newsreader Variable", Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

export const fontLabels: Record<BubbleFont, string> = {
  comic: "Comic",
  hand: "Hand",
  serif: "Book",
  sans: "Clean",
};

const brushShape: Record<StrokeItem["tool"], "pen" | "marker"> = {
  pen: "pen",
  brush: "pen",
  marker: "marker",
};

/** A pressure-shaped outline for a stroke, as an SVG path (also usable as a Path2D). */
export function sceneStrokePath(stroke: StrokeItem, live = false): string {
  return strokePath(
    { tool: brushShape[stroke.tool], color: "ink", size: stroke.size, points: stroke.points },
    live,
  );
}

const fmt = (value: number) => Math.round(value * 10) / 10;

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${fmt(cx - rx)} ${fmt(cy)} A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx + rx)} ${fmt(cy)} A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx - rx)} ${fmt(cy)} Z`;
}

/** A wedge from the bubble's edge to the tail point. */
function tailPath(bubble: BubbleItem, cx: number, cy: number): string | null {
  if (!bubble.tail) return null;
  const { x: tx, y: ty } = bubble.tail;
  const angle = Math.atan2(ty - cy, tx - cx);
  const spread = Math.min(bubble.w, bubble.h) * 0.16;
  const nx = -Math.sin(angle) * spread;
  const ny = Math.cos(angle) * spread;
  // Start a little inside the bubble so the joint hides under the fill.
  const bx = cx + Math.cos(angle) * (bubble.w * 0.32);
  const by = cy + Math.sin(angle) * (bubble.h * 0.32);
  return `M${fmt(bx + nx)} ${fmt(by + ny)} L${fmt(tx)} ${fmt(ty)} L${fmt(bx - nx)} ${fmt(by - ny)} Z`;
}

export interface BubbleShape {
  /** Paths outlined then filled, so joins between them disappear. */
  paths: string[];
  fill: string;
  outline: number;
}

/** The balloon, cloud, burst or box drawn behind a bubble's words. */
export function bubbleShape(bubble: BubbleItem): BubbleShape | null {
  const cx = bubble.x + bubble.w / 2;
  const cy = bubble.y + bubble.h / 2;
  const rx = bubble.w / 2;
  const ry = bubble.h / 2;
  switch (bubble.style) {
    case "text":
      return null;
    case "caption":
      return {
        paths: [
          `M${fmt(bubble.x)} ${fmt(bubble.y)} h${fmt(bubble.w)} v${fmt(bubble.h)} h${fmt(-bubble.w)} Z`,
        ],
        fill: "#fff6d8",
        outline: 3,
      };
    case "speech": {
      const tail = tailPath(bubble, cx, cy);
      return {
        paths: [ellipsePath(cx, cy, rx, ry), ...(tail ? [tail] : [])],
        fill: "#ffffff",
        outline: 3.5,
      };
    }
    case "thought": {
      // A cloud: puffs around the ellipse, then shrinking puffs toward the tail.
      const puffs: string[] = [];
      const count = Math.max(8, Math.round((bubble.w + bubble.h) / 55));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = Math.min(rx, ry) * 0.38;
        puffs.push(
          ellipsePath(cx + Math.cos(a) * rx * 0.82, cy + Math.sin(a) * ry * 0.78, r, r * 0.9),
        );
      }
      puffs.push(ellipsePath(cx, cy, rx * 0.86, ry * 0.8));
      if (bubble.tail) {
        for (const [t, size] of [
          [0.55, 0.11],
          [0.75, 0.075],
          [0.92, 0.05],
        ] as const) {
          const px = cx + (bubble.tail.x - cx) * t;
          const py = cy + (bubble.tail.y - cy) * t;
          const r = Math.min(bubble.w, bubble.h) * size;
          puffs.push(ellipsePath(px, py, r, r));
        }
      }
      return { paths: puffs, fill: "#ffffff", outline: 3 };
    }
    case "shout": {
      const spikes = 14;
      const points: string[] = [];
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2;
        const out = i % 2 === 0 ? 1.12 : 0.84;
        points.push(`${fmt(cx + Math.cos(a) * rx * out)} ${fmt(cy + Math.sin(a) * ry * out)}`);
      }
      const tail = tailPath(bubble, cx, cy);
      return {
        paths: [`M${points.join(" L")} Z`, ...(tail ? [tail] : [])],
        fill: "#ffffff",
        outline: 4,
      };
    }
  }
}

let measurer: CanvasRenderingContext2D | null = null;

export function fontFor(bubble: BubbleItem): string {
  const weight = bubble.style === "shout" || bubble.style === "text" ? 700 : 400;
  return `${weight} ${bubble.fontSize}px ${fontFamilies[bubble.font]}`;
}

/** Breaks the words onto lines that fit the bubble's inner width. */
export function wrapLines(text: string, font: string, maxWidth: number): string[] {
  measurer ??= document.createElement("canvas").getContext("2d");
  const ctx = measurer;
  if (!ctx) return text.split("\n");
  ctx.font = font;
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Lines of text, centred in the space a bubble leaves for words. */
export function bubbleText(bubble: BubbleItem): {
  lines: string[];
  x: number;
  firstBaseline: number;
  lineHeight: number;
  align: "center" | "left";
} {
  const boxed = bubble.style === "caption";
  const inner = boxed ? bubble.w - 36 : bubble.style === "text" ? bubble.w : bubble.w * 0.72;
  const lines = wrapLines(bubble.text, fontFor(bubble), inner);
  const lineHeight = bubble.fontSize * 1.18;
  const blockHeight = lines.length * lineHeight;
  const top = boxed ? bubble.y + 18 : bubble.y + (bubble.h - blockHeight) / 2;
  return {
    lines,
    x: boxed ? bubble.x + 18 : bubble.x + bubble.w / 2,
    firstBaseline: top + bubble.fontSize * 0.92,
    lineHeight,
    align: boxed ? "left" : "center",
  };
}
