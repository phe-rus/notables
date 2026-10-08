import { createId } from "@notables/core";
import { pushPoint, strokeHit } from "@notables/pluraliti";
import { type PointerEvent, useRef, useState } from "react";
import {
  type BrushTool,
  type BubbleItem,
  type BubbleStyle,
  newBubble,
  type PageScene,
  panelAt,
  type Rect,
  type SceneItem,
  type StrokeItem,
} from "../model/page-scene";
import { SceneView } from "./scene-view";

export type StudioTool = "select" | BrushTool | "eraser" | "bubble";

type Gesture =
  | { kind: "draw"; stroke: StrokeItem }
  | { kind: "erase" }
  | { kind: "move"; id: string; from: { x: number; y: number }; original: SceneItem }
  | { kind: "resize"; id: string; from: { x: number; y: number }; original: SceneItem }
  | { kind: "tail"; id: string };

const ERASER_RADIUS = 16;
/** Handle size on screen, in pixels. */
const HANDLE_PX = 11;

function contains(rect: Rect, x: number, y: number, slack = 0): boolean {
  return (
    x >= rect.x - slack &&
    x <= rect.x + rect.w + slack &&
    y >= rect.y - slack &&
    y <= rect.y + rect.h + slack
  );
}

function moved(item: SceneItem, dx: number, dy: number): SceneItem {
  if (item.type === "stroke") return item;
  if (item.type === "bubble") {
    return {
      ...item,
      x: item.x + dx,
      y: item.y + dy,
      tail: item.tail ? { x: item.tail.x + dx, y: item.tail.y + dy } : null,
    };
  }
  return { ...item, x: item.x + dx, y: item.y + dy };
}

/**
 * The page under the pen. Draws with pens and brushes, erases whole
 * strokes, places bubbles, and moves, resizes and points selected items.
 */
export function StudioCanvas({
  scene,
  tool,
  color,
  size,
  bubbleStyle,
  selectedId,
  zoom,
  onSelect,
  onPreview,
  onCommit,
  onApply,
}: {
  scene: PageScene;
  tool: StudioTool;
  color: string;
  size: number;
  bubbleStyle: BubbleStyle;
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onPreview: (scene: PageScene) => void;
  onCommit: () => void;
  onApply: (change: (scene: PageScene) => PageScene) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const penSeen = useRef(false);
  const [live, setLive] = useState<StrokeItem | null>(null);
  const [unitsPerPixel, setUnitsPerPixel] = useState(1);

  const toScene = (event: PointerEvent) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  const selected = scene.items.find((item) => item.id === selectedId) ?? null;
  const handle = HANDLE_PX * unitsPerPixel;

  const replaceItem = (id: string, next: SceneItem) =>
    onPreview({ ...scene, items: scene.items.map((item) => (item.id === id ? next : item)) });

  const eraseAt = (current: PageScene, x: number, y: number) => {
    const items = current.items.filter(
      (item) =>
        item.type !== "stroke" ||
        !strokeHit({ ...item, tool: "pen", color: "ink" }, x, y, ERASER_RADIUS),
    );
    if (items.length !== current.items.length) onPreview({ ...current, items });
  };

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "pen") penSeen.current = true;
    // Once a pen has been used, a resting palm doesn't draw.
    if (event.pointerType === "touch" && penSeen.current && tool !== "select") return;
    if (event.button > 0) return;
    const matrix = svg.current?.getScreenCTM();
    if (matrix) setUnitsPerPixel(1 / matrix.a);
    const { x, y } = toScene(event);

    if (tool === "pen" || tool === "brush" || tool === "marker") {
      const stroke: StrokeItem = {
        id: createId(),
        type: "stroke",
        tool,
        color,
        size,
        points: [],
        panel: panelAt(scene, x, y)?.id ?? null,
      };
      pushPoint(stroke.points, x, y, event.pointerType === "pen" ? event.pressure : 0.5);
      gesture.current = { kind: "draw", stroke };
      setLive({ ...stroke });
    } else if (tool === "eraser") {
      gesture.current = { kind: "erase" };
      eraseAt(scene, x, y);
    } else if (tool === "bubble") {
      const bubble = newBubble(bubbleStyle, x, y);
      onApply((current) => ({ ...current, items: [...current.items, bubble] }));
      onSelect(bubble.id);
      return;
    } else {
      // Handles of the selected item come first.
      if (selected && selected.type !== "stroke") {
        if (
          Math.hypot(x - (selected.x + selected.w), y - (selected.y + selected.h)) <=
          handle * 1.8
        ) {
          gesture.current = { kind: "resize", id: selected.id, from: { x, y }, original: selected };
        } else if (
          selected.type === "bubble" &&
          selected.tail &&
          Math.hypot(x - selected.tail.x, y - selected.tail.y) <= handle * 1.8
        ) {
          gesture.current = { kind: "tail", id: selected.id };
        }
      }
      if (!gesture.current) {
        const hit = [...scene.items]
          .reverse()
          .find((item) => item.type !== "stroke" && contains(item, x, y, 4)) as
          | Exclude<SceneItem, StrokeItem>
          | undefined;
        onSelect(hit?.id ?? null);
        if (!hit) return;
        gesture.current = { kind: "move", id: hit.id, from: { x, y }, original: hit };
      }
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current;
    if (!current) return;
    if (current.kind === "draw") {
      const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const sample of samples.length > 0 ? samples : [event.nativeEvent]) {
        const matrix = svg.current?.getScreenCTM();
        if (!matrix) break;
        const p = new DOMPoint(sample.clientX, sample.clientY).matrixTransform(matrix.inverse());
        pushPoint(
          current.stroke.points,
          p.x,
          p.y,
          sample.pointerType === "pen" ? sample.pressure : 0.5,
        );
      }
      setLive({ ...current.stroke, points: [...current.stroke.points] });
      return;
    }
    const { x, y } = toScene(event);
    if (current.kind === "erase") {
      eraseAt(scene, x, y);
    } else if (current.kind === "move") {
      replaceItem(current.id, moved(current.original, x - current.from.x, y - current.from.y));
    } else if (current.kind === "resize") {
      const original = current.original as Exclude<SceneItem, StrokeItem>;
      const w = Math.max(60, original.w + x - current.from.x);
      // Pictures keep their shape.
      const h =
        original.type === "picture"
          ? (w * original.h) / original.w
          : Math.max(50, original.h + y - current.from.y);
      replaceItem(current.id, { ...original, w, h });
    } else if (current.kind === "tail") {
      const bubble = scene.items.find((item) => item.id === current.id) as BubbleItem | undefined;
      if (bubble) replaceItem(current.id, { ...bubble, tail: { x, y } });
    }
  };

  const up = () => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    if (current.kind === "draw") {
      setLive(null);
      if (current.stroke.points.length >= 3) {
        onApply((scene) => ({ ...scene, items: [...scene.items, current.stroke] }));
      }
      return;
    }
    onCommit();
  };

  const drawing = tool !== "select";
  return (
    <svg
      ref={svg}
      // Artwork, not an icon: keep the app's two-tone icon styling off it.
      data-brand
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="img"
      aria-label="Page"
      className="block max-h-none shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_20px_50px_-20px_rgb(0_0_0/0.45)]"
      style={{
        width: `${zoom * 100}%`,
        aspectRatio: `${scene.width} / ${scene.height}`,
        touchAction: drawing ? "none" : "pan-x pan-y",
        cursor: tool === "select" ? "default" : "crosshair",
        background: scene.paper,
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <SceneView scene={scene} live={live}>
        {selected && selected.type !== "stroke" && (
          <g pointerEvents="none">
            <rect
              x={selected.x}
              y={selected.y}
              width={selected.w}
              height={selected.h}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2 * unitsPerPixel}
              strokeDasharray={`${6 * unitsPerPixel} ${4 * unitsPerPixel}`}
            />
            <circle
              cx={selected.x + selected.w}
              cy={selected.y + selected.h}
              r={handle}
              fill="var(--color-accent)"
              stroke="#fff"
              strokeWidth={2 * unitsPerPixel}
            />
            {selected.type === "bubble" && selected.tail && (
              <circle
                cx={selected.tail.x}
                cy={selected.tail.y}
                r={handle}
                fill="#fff"
                stroke="var(--color-accent)"
                strokeWidth={3 * unitsPerPixel}
              />
            )}
          </g>
        )}
      </SceneView>
    </svg>
  );
}
