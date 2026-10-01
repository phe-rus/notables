import { springs } from "@notables/tokens";
import type { Transition } from "motion/react";

/** Design-token springs as motion/react transitions. */
export const spring = {
  smooth: { type: "spring", ...springs.smooth },
  snappy: { type: "spring", ...springs.snappy },
  bouncy: { type: "spring", ...springs.bouncy },
} as const satisfies Record<keyof typeof springs, Transition>;

/** Menus, popovers and floating toolbars: grow from their anchor. */
export const popoverMotion = {
  initial: { opacity: 0, scale: 0.94, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } },
  transition: spring.snappy,
} as const;

/** Floating bars that rise from the bottom edge. */
export const riseMotion = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 24 },
  transition: spring.smooth,
} as const;
