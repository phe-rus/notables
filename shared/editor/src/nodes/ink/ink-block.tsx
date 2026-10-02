import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { cn } from "@notables/ui";
import { $getNodeByKey, type NodeKey, UNDO_COMMAND } from "lexical";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import {
  INK_WIDTH,
  type InkColor,
  type InkStroke,
  type InkTool,
  inkBottom,
  inkColorLabels,
  inkColors,
  pushPoint,
  strokeHit,
  toolSizes,
} from "./ink-model";
import { $isInkNode } from "./ink-node";
import { InkView } from "./ink-view";

type Tool = InkTool | "eraser";

const PEN_SEEN = "notables:pen-seen";
const GROW_MARGIN = 80;
const GROW_STEP = 240;
const ERASER_RADIUS = 14;

function penSeen(): boolean {
  try {
    return localStorage.getItem(PEN_SEEN) !== null;
  } catch {
    return false;
  }
}

function rememberPen() {
  try {
    localStorage.setItem(PEN_SEEN, "1");
  } catch {
    // Palm rejection simply starts fresh next time.
  }
}

/**
 * A handwriting area inside a note. Pens and mice always write. Fingers
 * write too until a pen has been used on this device; after that a resting
 * palm or a scrolling finger never leaves marks, unless "Draw with finger"
 * is turned on.
 */
export function InkBlock({
  nodeKey,
  strokes,
  height,
}: {
  nodeKey: NodeKey;
  strokes: InkStroke[];
  height: number;
}) {
  const [editor] = useLexicalComposerContext();
  const editable = useLexicalEditable();
  const surface = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<InkColor>("ink");
  const [fingerDraws, setFingerDraws] = useState(() => !penSeen());
  const [touchDevice, setTouchDevice] = useState(false);
  const [live, setLive] = useState<InkStroke | null>(null);
  const [erased, setErased] = useState<Set<number>>(new Set());
  const drawing = useRef<{ pointerId: number; stroke: InkStroke | null } | null>(null);
  const frame = useRef(0);

  useEffect(() => setTouchDevice(navigator.maxTouchPoints > 0), []);

  const commit = (next: InkStroke[]) => {
    // Keep room below the lowest line so writing can carry on.
    const needed = inkBottom(next) + GROW_MARGIN;
    const nextHeight = needed > height ? Math.max(height + GROW_STEP, needed) : height;
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isInkNode(node)) node.setInk(next, nextHeight);
    });
  };

  const toInk = (event: PointerEvent) => {
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = INK_WIDTH / rect.width;
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
  };

  const accepts = (event: PointerEvent) => {
    if (!editable) return false;
    if (event.pointerType === "pen") {
      if (!penSeen()) {
        rememberPen();
        setFingerDraws(false);
      }
      return true;
    }
    if (event.pointerType === "touch") return fingerDraws;
    return event.button === 0;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (drawing.current || !accepts(event)) return;
    event.preventDefault();
    try {
      // Keep the stroke even if the pen strays outside the area.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some pointers can't be captured; the stroke still works inside the area.
    }
    const { x, y } = toInk(event);
    if (tool === "eraser") {
      drawing.current = { pointerId: event.pointerId, stroke: null };
      erase(x, y);
      return;
    }
    const stroke: InkStroke = { tool, color, size: toolSizes[tool], points: [] };
    pushPoint(stroke.points, x, y, event.pointerType === "pen" ? event.pressure : 0.5);
    drawing.current = { pointerId: event.pointerId, stroke };
    setLive({ ...stroke, points: [...stroke.points] });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drawing.current;
    if (!current || current.pointerId !== event.pointerId) return;
    // Pens report many points between frames; keep them all for a smooth line.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const events = coalesced.length ? coalesced : [event.nativeEvent];
    for (const point of events) {
      const { x, y } = toInk(point as unknown as PointerEvent);
      if (!current.stroke) erase(x, y);
      else
        pushPoint(current.stroke.points, x, y, event.pointerType === "pen" ? point.pressure : 0.5);
    }
    const stroke = current.stroke;
    if (stroke) {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() =>
        setLive({ ...stroke, points: [...stroke.points] }),
      );
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drawing.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drawing.current = null;
    cancelAnimationFrame(frame.current);
    setLive(null);
    if (current.stroke) {
      if (current.stroke.points.length >= 3) commit([...strokes, current.stroke]);
    } else if (erased.size > 0) {
      commit(strokes.filter((_, index) => !erased.has(index)));
      setErased(new Set());
    }
  };

  const erase = (x: number, y: number) => {
    setErased((current) => {
      let next = current;
      strokes.forEach((stroke, index) => {
        if (!current.has(index) && strokeHit(stroke, x, y, ERASER_RADIUS)) {
          if (next === current) next = new Set(current);
          next.add(index);
        }
      });
      return next;
    });
  };

  const addRoom = () =>
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isInkNode(node)) node.setInk(strokes, height + GROW_STEP);
    });

  const visible = erased.size ? strokes.filter((_, index) => !erased.has(index)) : strokes;

  return (
    <div className={cn("nt-ink-frame", editable && "is-editable")}>
      {editable && (
        <div className="nt-ink-toolbar" role="toolbar" aria-label="Handwriting tools">
          {(["pen", "marker", "eraser"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={tool === option}
              onClick={() => setTool(option)}
              className="nt-ink-tool"
            >
              {option === "pen" ? "Pen" : option === "marker" ? "Marker" : "Eraser"}
            </button>
          ))}
          <span className="nt-ink-divider" />
          {inkColors.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={inkColorLabels[option]}
              aria-pressed={color === option && tool !== "eraser"}
              onClick={() => {
                setColor(option);
                if (tool === "eraser") setTool("pen");
              }}
              className={`nt-ink-swatch nt-ink-fill-${option}`}
            />
          ))}
          <span className="nt-ink-divider" />
          <button
            type="button"
            className="nt-ink-tool"
            onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          >
            Undo
          </button>
          {touchDevice && (
            <button
              type="button"
              aria-pressed={fingerDraws}
              onClick={() => setFingerDraws((value) => !value)}
              className="nt-ink-tool"
            >
              Draw with finger
            </button>
          )}
        </div>
      )}
      <div
        ref={surface}
        className={cn("nt-ink-surface", editable && `is-${tool}`)}
        // Fingers scroll the page unless they're drawing.
        style={{ touchAction: editable && fingerDraws ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <InkView strokes={visible} height={height} live={live} />
        {editable && strokes.length === 0 && !live && (
          <p className="nt-ink-hint">Write or draw here with a pen, your finger or the mouse.</p>
        )}
      </div>
      {editable && (
        <button type="button" className="nt-ink-room" onClick={addRoom}>
          More room
        </button>
      )}
    </div>
  );
}
