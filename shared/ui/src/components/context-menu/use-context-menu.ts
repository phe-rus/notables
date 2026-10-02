import { type MouseEvent, type PointerEvent, useRef } from "react";
import { type ContextMenuItem, openContextMenu } from "./context-menu-store";

const LONG_PRESS_MS = 480;
const MOVE_TOLERANCE = 10;

/**
 * Right-click on desktop, long-press on touch screens: both open the same
 * menu of actions. Spread the returned handlers onto the element.
 */
export function useContextMenu(items: () => ContextMenuItem[]) {
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const suppressClick = useRef(false);

  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  return {
    onContextMenu(event: MouseEvent) {
      event.preventDefault();
      cancel();
      openContextMenu(event.clientX, event.clientY, items(), false);
    },
    onPointerDown(event: PointerEvent) {
      if (event.pointerType !== "touch") return;
      const { clientX: x, clientY: y } = event;
      cancel();
      press.current = {
        x,
        y,
        timer: setTimeout(() => {
          press.current = null;
          suppressClick.current = true;
          navigator.vibrate?.(8);
          openContextMenu(x, y, items(), true);
        }, LONG_PRESS_MS),
      };
    },
    onPointerMove(event: PointerEvent) {
      const start = press.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE) {
        cancel();
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    // The tap that ends a long-press shouldn't also open the row.
    onClickCapture(event: MouseEvent) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
