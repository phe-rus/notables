import { cn } from "@notables/ui";
import { useRef } from "react";

/**
 * A vertical edge that resizes the pane before it. Reports widths while
 * dragging and once more when the drag ends, so callers can preview live
 * and store only the final width. Double-click restores the default.
 */
export function ResizeHandle({
  width,
  min,
  max,
  onResize,
  onCommit,
  onReset,
  label,
  className,
}: {
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
  onCommit: (width: number) => void;
  onReset: () => void;
  label: string;
  className?: string;
}) {
  const drag = useRef<{ startX: number; startWidth: number; latest: number } | null>(null);
  const clamp = (value: number) => Math.round(Math.min(max, Math.max(min, value)));

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable, draggable splitter has no native element; <hr> cannot take focus or pointer input.
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { startX: event.clientX, startWidth: width, latest: width };
        window.document.body.style.cursor = "col-resize";
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        drag.current.latest = clamp(drag.current.startWidth + event.clientX - drag.current.startX);
        onResize(drag.current.latest);
      }}
      onPointerUp={() => {
        if (drag.current) onCommit(drag.current.latest);
        drag.current = null;
        window.document.body.style.cursor = "";
      }}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 32 : 8;
        if (event.key === "ArrowLeft") onCommit(clamp(width - step));
        if (event.key === "ArrowRight") onCommit(clamp(width + step));
      }}
      className={cn(
        "group absolute inset-y-0 -right-[3px] z-10 w-[6px] cursor-col-resize outline-none",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-fast group-hover:bg-accent/70 group-focus-visible:bg-accent group-active:bg-accent" />
    </div>
  );
}
