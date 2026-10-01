import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { cn } from "../../lib/class-names";
import { popoverMotion } from "../../motion/transitions";

export interface PopoverProps extends HTMLMotionProps<"div"> {
  open: boolean;
  /** Which corner the popover grows from. */
  origin?: "top-left" | "top-right";
}

/**
 * A glass surface that springs open from its anchor. Position it with
 * `className` (it is absolutely positioned within a relative parent).
 */
export function Popover({
  open,
  origin = "top-left",
  className,
  children,
  ...props
}: PopoverProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...popoverMotion}
          style={{ transformOrigin: origin === "top-left" ? "0% 0%" : "100% 0%" }}
          className={cn("glass-menu absolute z-40 rounded-[22px]", className)}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
