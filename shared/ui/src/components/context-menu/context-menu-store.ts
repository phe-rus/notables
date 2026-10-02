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
}

let menu: OpenMenu | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function openContextMenu(x: number, y: number, items: ContextMenuItem[], touch = false) {
  menu = { id: nextId++, x, y, items, touch };
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
