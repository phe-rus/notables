import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/class-names";
import { screenEdges } from "../../lib/screen-edges";
import { popoverMotion } from "../../motion/transitions";

export interface PopoverProps extends HTMLMotionProps<"div"> {
  open: boolean;
  /** Which corner the popover grows from. */
  origin?: "top-left" | "top-right";
}

/**
 * A glass surface that springs open from its anchor. Position it with
 * `className` (it is absolutely positioned within a relative parent); it
 * moves itself back inside the screen if that would cross an edge.
 */
export function Popover({ open, ...props }: PopoverProps) {
  return <AnimatePresence>{open && <OpenPopover {...props} />}</AnimatePresence>;
}

function OpenPopover({
  origin = "top-left",
  className,
  style,
  children,
  ...props
}: Omit<PopoverProps, "open">) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ shift: number; maxHeight?: number }>({ shift: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Where it sits once open: measured without the opening scale, before paint.
    const transform = element.style.transform;
    element.style.transform = "none";
    const rect = element.getBoundingClientRect();
    element.style.transform = transform;
    const edges = screenEdges();
    const right = window.innerWidth - edges.right;
    let shift = 0;
    if (rect.right > right) shift = right - rect.right;
    if (rect.left + shift < edges.left) shift = edges.left - rect.left;
    const room = window.innerHeight - edges.bottom - rect.top;
    setFit({ shift, maxHeight: rect.height > room ? Math.max(room, 160) : undefined });
  }, []);

  return (
    <motion.div
      ref={ref}
      {...popoverMotion}
      style={{
        transformOrigin: origin === "top-left" ? "0% 0%" : "100% 0%",
        x: fit.shift,
        maxHeight: fit.maxHeight,
        overflowY: fit.maxHeight ? "auto" : undefined,
        ...style,
      }}
      className={cn("glass-menu absolute z-40 rounded-5xl", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
