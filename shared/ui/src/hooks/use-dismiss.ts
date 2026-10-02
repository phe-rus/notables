import { type RefObject, useEffect } from "react";

/** Marks a floating layer (a pop-up list, a menu) whose clicks belong to what opened it. */
export const FLOATING_LAYER = "data-floating-layer";

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
      if (ref.current?.contains(target) || target.closest?.(`[${FLOATING_LAYER}]`)) return;
      onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, active, onDismiss]);
}
