import { createId } from "@notables/core";

/**
 * One drawn page of a comic, manga or picture book, kept so it can be
 * edited again. Coordinates are page units: pages are 1000 wide.
 */
export interface PageScene {
  version: 1;
  size: PageSize;
  width: number;
  height: number;
  /** Colour of the paper around and inside panels. */
  paper: string;
  layout: PanelLayout;
  panels: Panel[];
  /** Back to front. */
  items: SceneItem[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Panel extends Rect {
  id: string;
}

export type BrushTool = "pen" | "brush" | "marker";

export interface StrokeItem {
  id: string;
  type: "stroke";
  tool: BrushTool;
  color: string;
  size: number;
  /** Flat [x, y, pressure, …]. */
  points: number[];
  /** The panel it was drawn in; it stays inside it. */
  panel: string | null;
}

export type BubbleStyle = "speech" | "thought" | "shout" | "caption" | "text";
export type BubbleFont = "comic" | "hand" | "serif" | "sans";

export interface BubbleItem extends Rect {
  id: string;
  type: "bubble";
  style: BubbleStyle;
  text: string;
  font: BubbleFont;
  fontSize: number;
  /** Where the tail points, or null for none. */
  tail: { x: number; y: number } | null;
}

export interface PictureItem extends Rect {
  id: string;
  type: "picture";
  /** `media:<id>`. */
  src: string;
  panel: string | null;
}

export type SceneItem = StrokeItem | BubbleItem | PictureItem;

export type PageSize = "manga" | "comic" | "square" | "landscape" | "strip";

export const pageSizes: Record<PageSize, { label: string; width: number; height: number }> = {
  manga: { label: "Manga", width: 1000, height: 1460 },
  comic: { label: "Comic", width: 1000, height: 1540 },
  square: { label: "Square", width: 1000, height: 1000 },
  landscape: { label: "Picture book", width: 1400, height: 1000 },
  strip: { label: "Strip", width: 1600, height: 560 },
};

export type PanelLayout =
  | "none"
  | "full"
  | "two-rows"
  | "three-rows"
  | "grid-4"
  | "grid-6"
  | "feature-top"
  | "manga-5"
  | "strip-3";

export const panelLayoutLabels: Record<PanelLayout, string> = {
  none: "No panels",
  full: "One panel",
  "two-rows": "Two rows",
  "three-rows": "Three rows",
  "grid-4": "Four",
  "grid-6": "Six",
  "feature-top": "Big top",
  "manga-5": "Manga five",
  "strip-3": "Three across",
};

const MARGIN = 48;
const GUTTER = 22;

/** Fractions of the live area, as [x, y, w, h], for each layout. */
const layoutCells: Record<PanelLayout, Array<[number, number, number, number]>> = {
  none: [],
  full: [[0, 0, 1, 1]],
  "two-rows": [
    [0, 0, 1, 0.5],
    [0, 0.5, 1, 0.5],
  ],
  "three-rows": [
    [0, 0, 1, 1 / 3],
    [0, 1 / 3, 1, 1 / 3],
    [0, 2 / 3, 1, 1 / 3],
  ],
  "grid-4": [
    [0, 0, 0.5, 0.5],
    [0.5, 0, 0.5, 0.5],
    [0, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
  ],
  "grid-6": [
    [0, 0, 0.5, 1 / 3],
    [0.5, 0, 0.5, 1 / 3],
    [0, 1 / 3, 0.5, 1 / 3],
    [0.5, 1 / 3, 0.5, 1 / 3],
    [0, 2 / 3, 0.5, 1 / 3],
    [0.5, 2 / 3, 0.5, 1 / 3],
  ],
  "feature-top": [
    [0, 0, 1, 0.55],
    [0, 0.55, 0.5, 0.45],
    [0.5, 0.55, 0.5, 0.45],
  ],
  "manga-5": [
    [0, 0, 0.62, 0.3],
    [0.62, 0, 0.38, 0.3],
    [0, 0.3, 1, 0.38],
    [0, 0.68, 0.4, 0.32],
    [0.4, 0.68, 0.6, 0.32],
  ],
  "strip-3": [
    [0, 0, 1 / 3, 1],
    [1 / 3, 0, 1 / 3, 1],
    [2 / 3, 0, 1 / 3, 1],
  ],
};

/** Panels for a layout on a page, with even gutters between them. */
export function layoutPanels(layout: PanelLayout, width: number, height: number): Panel[] {
  const liveW = width - MARGIN * 2 + GUTTER;
  const liveH = height - MARGIN * 2 + GUTTER;
  return layoutCells[layout].map(([fx, fy, fw, fh], index) => ({
    id: `p${index + 1}`,
    x: Math.round(MARGIN + fx * liveW),
    y: Math.round(MARGIN + fy * liveH),
    w: Math.round(fw * liveW - GUTTER),
    h: Math.round(fh * liveH - GUTTER),
  }));
}

export function newScene(size: PageSize = "manga", layout: PanelLayout = "manga-5"): PageScene {
  const { width, height } = pageSizes[size];
  return {
    version: 1,
    size,
    width,
    height,
    paper: "#ffffff",
    layout: size === "strip" && layout === "manga-5" ? "strip-3" : layout,
    panels: layoutPanels(
      size === "strip" && layout === "manga-5" ? "strip-3" : layout,
      width,
      height,
    ),
    items: [],
  };
}

/** The same page at a new size or layout; items keep their place in proportion. */
export function reshape(scene: PageScene, size: PageSize, layout: PanelLayout): PageScene {
  const { width, height } = pageSizes[size];
  const sx = width / scene.width;
  const sy = height / scene.height;
  const scaleRect = <T extends Rect>(rect: T): T => ({
    ...rect,
    x: rect.x * sx,
    y: rect.y * sy,
    w: rect.w * sx,
    h: rect.h * sy,
  });
  const items = scene.items.map((item): SceneItem => {
    if (item.type === "stroke") {
      return {
        ...item,
        points: item.points.map((value, index) =>
          index % 3 === 0 ? value * sx : index % 3 === 1 ? value * sy : value,
        ),
      };
    }
    if (item.type === "bubble") {
      return {
        ...scaleRect(item),
        tail: item.tail ? { x: item.tail.x * sx, y: item.tail.y * sy } : null,
      };
    }
    return scaleRect(item);
  });
  const panels = layoutPanels(layout, width, height);
  const known = new Set(panels.map((panel) => panel.id));
  return {
    ...scene,
    size,
    width,
    height,
    layout,
    panels,
    // Items drawn in a panel that no longer exists are set free.
    items: items.map((item) =>
      "panel" in item && item.panel && !known.has(item.panel) ? { ...item, panel: null } : item,
    ),
  };
}

export function panelAt(scene: PageScene, x: number, y: number): Panel | null {
  return scene.panels.find((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) ?? null;
}

export function newBubble(style: BubbleStyle, x: number, y: number): BubbleItem {
  const caption = style === "caption" || style === "text";
  const w = caption ? 340 : 300;
  const h = caption ? 110 : 180;
  return {
    id: createId(),
    type: "bubble",
    style,
    text: "",
    font: style === "caption" ? "serif" : "comic",
    fontSize: style === "text" ? 54 : 34,
    x: x - w / 2,
    y: y - h / 2,
    w,
    h,
    tail: caption ? null : { x: x - w / 4, y: y + h / 2 + 90 },
  };
}

export function isPageScene(value: unknown): value is PageScene {
  const scene = value as PageScene | null;
  return (
    !!scene &&
    scene.version === 1 &&
    typeof scene.width === "number" &&
    Array.isArray(scene.items) &&
    Array.isArray(scene.panels)
  );
}
