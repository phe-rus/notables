import { type RefObject, useEffect } from "react";
import { ownsFloatingLayer } from "../lib/floating-layers";

/** Marks a floating layer (a pop-up list, a menu) whose clicks belong to what opened it. */
export { FLOATING_LAYER } from "../lib/floating-layers";

/**
 * Calls `onDismiss` when the user presses Escape or clicks outside `ref`
 * while `active`, for menus, popovers and sheets. Clicks in a floating
 * layer opened from inside, such as a pop-up button's list, don't count.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      const surface = ref.current;
      if (surface && (surface.contains(target) || ownsFloatingLayer(surface, target))) return;
      onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (ref.current && ownsFloatingLayer(ref.current, document.activeElement)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, active, onDismiss]);
}
