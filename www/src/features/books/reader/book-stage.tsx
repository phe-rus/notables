import { cn, spring } from "@notables/ui";
import { animate, type MotionValue, motion, useMotionValue, useTransform } from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { PageGeometry } from "./page-geometry";

/**
 * Faces are addressed by index: -2 is the front cover, -1 the inside
 * cover, 0…total-1 the pages. In spread mode the position is the index of
 * the left-hand face (-3 means the book is closed).
 */
export const FRONT_COVER = -2;
export const CLOSED_SPREAD = -3;

export type Side = "left" | "right";
type Direction = "forward" | "backward";

export interface BookStageProps {
  geometry: PageGeometry;
  total: number;
  position: number;
  onPositionChange: (position: number) => void;
  renderFace: (index: number, side: Side) => ReactNode;
  /** False while highlighting: pointers select text instead of turning pages. */
  interactive?: boolean;
}

/** How far a drag must travel (of a page width) to complete a turn. */
const COMMIT_PROGRESS = 0.35;
/** Fling speed (px/ms) that completes a turn regardless of distance. */
const COMMIT_VELOCITY = 0.45;
const TAP_SLOP = 6;

export function stepFor(spread: boolean) {
  return spread ? 2 : 1;
}

export function canTurn(direction: Direction, position: number, total: number, spread: boolean) {
  if (spread) {
    return direction === "forward" ? position + 2 <= total - 1 : position >= -1;
  }
  return direction === "forward" ? position + 1 <= total - 1 : position - 1 >= FRONT_COVER;
}

/**
 * A book on a stage. Pages turn as 3D leaves around the spine: drag a page
 * by hand, fling it, tap either side, or use the arrow keys.
 */
export function BookStage({
  geometry,
  total,
  position,
  onPositionChange,
  renderFace,
  interactive = true,
}: BookStageProps) {
  const { spread, pageWidth, pageHeight } = geometry;
  const angle = useMotionValue(0);
  const [turning, setTurning] = useState<Direction | null>(null);
  const busy = useRef(false);
  const drag = useRef<{
    x: number;
    t: number;
    lastX: number;
    lastT: number;
    direction?: Direction;
    moved: boolean;
  } | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const finish = useCallback(
    (direction: Direction, complete: boolean, velocity = 0) => {
      const target = complete ? 180 : 0;
      animate(angle, target, { ...spring.smooth, velocity: velocity * 180 }).then(() => {
        if (complete) {
          const step = stepFor(spread) * (direction === "forward" ? 1 : -1);
          onPositionChange(position + step);
        }
        angle.set(0);
        setTurning(null);
        busy.current = false;
      });
    },
    [angle, onPositionChange, position, spread],
  );

  const turn = useCallback(
    (direction: Direction) => {
      if (busy.current || !canTurn(direction, position, total, spread)) return;
      busy.current = true;
      setTurning(direction);
      finish(direction, true);
    },
    [finish, position, spread, total],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        turn("forward");
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        turn("backward");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (busy.current) return;
    const now = performance.now();
    drag.current = { x: event.clientX, t: now, lastX: event.clientX, lastT: now, moved: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < TAP_SLOP) return;
    if (!state.direction) {
      const direction: Direction = dx < 0 ? "forward" : "backward";
      if (!canTurn(direction, position, total, spread)) return;
      state.direction = direction;
      busy.current = true;
      setTurning(direction);
    }
    state.moved = true;
    const progress = Math.min(
      1,
      Math.max(0, (state.direction === "forward" ? -dx : dx) / (pageWidth * 1.1)),
    );
    angle.set(progress * 180);
    state.lastX = event.clientX;
    state.lastT = performance.now();
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;

    if (!state.moved) {
      // A tap: right side turns forward, left side turns back.
      const rect = stage.current?.getBoundingClientRect();
      const ratio = rect ? (event.clientX - rect.left) / rect.width : 1;
      turn(ratio > 0.4 ? "forward" : "backward");
      return;
    }
    if (!state.direction) return;

    const elapsed = Math.max(1, performance.now() - state.lastT);
    const velocity = (event.clientX - state.lastX) / elapsed;
    const towards = state.direction === "forward" ? -velocity : velocity;
    const progress = angle.get() / 180;
    finish(
      state.direction,
      progress > COMMIT_PROGRESS || towards > COMMIT_VELOCITY,
      Math.max(0, towards),
    );
  };

  const width = spread ? pageWidth * 2 : pageWidth;

  return (
    <div
      ref={stage}
      role="application"
      aria-label="Book. Use the arrow keys or swipe to turn pages."
      className={cn("relative", interactive ? "touch-none select-none" : "select-text")}
      style={{ width, height: pageHeight, perspective: pageWidth * 3.2 }}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    >
      {spread ? (
        <SpreadLayers
          geometry={geometry}
          position={position}
          turning={turning}
          angle={angle}
          renderFace={renderFace}
        />
      ) : (
        <SingleLayers
          geometry={geometry}
          position={position}
          turning={turning}
          angle={angle}
          renderFace={renderFace}
        />
      )}
    </div>
  );
}

interface LayerProps {
  geometry: PageGeometry;
  position: number;
  turning: Direction | null;
  angle: MotionValue<number>;
  renderFace: (index: number, side: Side) => ReactNode;
  /** False while highlighting: pointers select text instead of turning pages. */
  interactive?: boolean;
}

function SpreadLayers({ geometry, position: left, turning, angle, renderFace }: LayerProps) {
  const { pageWidth, pageHeight } = geometry;
  // A closed book sits centred on its cover; it slides into a spread as it opens.
  const openingFrom = left === CLOSED_SPREAD && turning === "forward";
  const closingTo = left === -1 && turning === "backward";
  const shift = useTransform(angle, (a) => {
    if (openingFrom) return (-pageWidth / 2) * (1 - a / 180);
    if (closingTo) return (-pageWidth / 2) * (a / 180);
    return left === CLOSED_SPREAD ? -pageWidth / 2 : 0;
  });

  const staticLeft = turning === "backward" ? left - 2 : left;
  const staticRight = turning === "forward" ? left + 3 : left + 1;

  return (
    <motion.div className="absolute inset-0" style={{ x: shift }}>
      <Slot side="left" geometry={geometry}>
        {/* The left side shows the inside cover or a page, never the front cover. */}
        {staticLeft > FRONT_COVER ? renderFace(staticLeft, "left") : null}
      </Slot>
      <Slot side="right" geometry={geometry}>
        {renderFace(staticRight, "right")}
      </Slot>
      {turning && (
        <Leaf
          angle={angle}
          origin={turning === "forward" ? "left" : "right"}
          direction={turning}
          style={{
            left: turning === "forward" ? pageWidth : 0,
            width: pageWidth,
            height: pageHeight,
          }}
          front={renderFace(
            turning === "forward" ? left + 1 : left,
            turning === "forward" ? "right" : "left",
          )}
          back={renderFace(
            turning === "forward" ? left + 2 : left - 1,
            turning === "forward" ? "left" : "right",
          )}
        />
      )}
      <Spine visible={left !== CLOSED_SPREAD || turning !== null} geometry={geometry} />
    </motion.div>
  );
}

function SingleLayers({ geometry, position, turning, angle, renderFace }: LayerProps) {
  const { pageWidth, pageHeight } = geometry;
  const under = turning === "forward" ? position + 1 : position;
  const leafIndex = turning === "forward" ? position : position - 1;
  // Turning back, the previous page swings in from the left.
  const leafAngle = useTransform(angle, (a) => (turning === "backward" ? 180 - a : a));

  return (
    <>
      <Slot side="right" geometry={geometry} single>
        {renderFace(under, "right")}
      </Slot>
      {turning && (
        <Leaf
          angle={leafAngle}
          origin="left"
          direction="forward"
          style={{ left: 0, width: pageWidth, height: pageHeight }}
          front={renderFace(leafIndex, "right")}
          back={<div className="book-paper h-full w-full" />}
        />
      )}
    </>
  );
}

function Slot({
  side,
  geometry,
  single,
  children,
}: {
  side: Side;
  geometry: PageGeometry;
  single?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute top-0"
      style={{
        left: single || side === "left" ? 0 : geometry.pageWidth,
        width: geometry.pageWidth,
        height: geometry.pageHeight,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A turning page. Rotates around the spine with a front and back face and
 * a shade that deepens as the page lifts.
 */
function Leaf({
  angle,
  origin,
  direction,
  style,
  front,
  back,
}: {
  angle: MotionValue<number>;
  origin: Side;
  direction: Direction;
  style: React.CSSProperties;
  front: ReactNode;
  back: ReactNode;
}) {
  const rotateY = useTransform(angle, (a) => (direction === "forward" ? -a : a));
  const lift = useTransform(angle, [0, 90, 180], [0, 1, 0]);
  const frontShade = useTransform(lift, (l) => l * 0.28);
  const backShade = useTransform(lift, (l) => l * 0.18);
  const shadow = useTransform(
    lift,
    (l) => `0 ${8 + l * 18}px ${24 + l * 40}px rgb(40 30 10 / ${0.12 + l * 0.18})`,
  );

  return (
    <motion.div
      className="absolute top-0 z-10"
      style={{
        ...style,
        rotateY,
        transformOrigin: `${origin} center`,
        transformStyle: "preserve-3d",
        boxShadow: shadow,
      }}
    >
      <div className="absolute inset-0 [backface-visibility:hidden]">
        {front}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: frontShade,
            background: `linear-gradient(${origin === "left" ? "to left" : "to right"}, rgb(0 0 0 / 0.55), transparent 70%)`,
          }}
        />
      </div>
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        {back}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: backShade,
            background: `linear-gradient(${origin === "left" ? "to right" : "to left"}, rgb(0 0 0 / 0.5), transparent 60%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

function Spine({ visible, geometry }: { visible: boolean; geometry: PageGeometry }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 z-20"
      style={{
        left: geometry.pageWidth - 14,
        width: 28,
        height: geometry.pageHeight,
        background:
          "linear-gradient(to right, transparent, rgb(60 40 10 / 0.10) 40%, rgb(60 40 10 / 0.18) 50%, rgb(60 40 10 / 0.10) 60%, transparent)",
      }}
    />
  );
}
