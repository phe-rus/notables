import type { ReactNode } from "react";

/** One row of a context menu, or a divider between groups of rows. */
export type ContextMenuItem =
  | {
      label: string;
      icon?: ReactNode;
      onSelect: () => void;
      destructive?: boolean;
      disabled?: boolean;
      /** Marks the current choice, e.g. a note's kind. */
      checked?: boolean;
    }
  | { heading: string }
  | "divider";

export interface OpenMenu {
  id: number;
  x: number;
  y: number;
  items: ContextMenuItem[];
  /** Opened by long-press: bigger rows for fingers. */
  touch: boolean;
  /** Which edge of the menu sits at `x`: its left (`start`) or its right (`end`). */
  alignX: "start" | "end";
  /** Which edge of the menu sits at `y`: its top (`top`) or its bottom (`bottom`). */
  alignY: "top" | "bottom";
}

let menu: OpenMenu | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

/** Opens a menu at a point, such as where a pointer was pressed. */
export function openContextMenu(x: number, y: number, items: ContextMenuItem[], touch = false) {
  menu = { id: nextId++, x, y, items, touch, alignX: "start", alignY: "top" };
  emit();
}

/**
 * Opens a menu from a control, the way a SwiftUI `Menu` does: under it (or
 * above it), lined up with its leading or trailing edge. Leading and
 * trailing follow the text direction, so right-to-left languages mirror.
 * The menu's real size decides where it goes; nothing is guessed.
 */
export function openMenu(
  anchor: Element,
  items: ContextMenuItem[],
  { edge = "leading", above = false }: { edge?: "leading" | "trailing"; above?: boolean } = {},
) {
  const rect = anchor.getBoundingClientRect();
  const rtl = getComputedStyle(anchor).direction === "rtl";
  // Trailing is the right edge in left-to-right text, the left edge in right-to-left.
  const right = (edge === "trailing") !== rtl;
  const gap = 6;
  menu = {
    id: nextId++,
    x: right ? rect.right : rect.left,
    y: above ? rect.top - gap : rect.bottom + gap,
    items,
    touch: false,
    alignX: right ? "end" : "start",
    alignY: above ? "bottom" : "top",
  };
  emit();
}

export function closeContextMenu() {
  if (!menu) return;
  menu = null;
  emit();
}

export function subscribeContextMenu(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getContextMenu(): OpenMenu | null {
  return menu;
}
