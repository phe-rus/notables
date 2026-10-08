export interface ScreenEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

let probe: HTMLDivElement | undefined;

/**
 * How far menus and popovers keep from each side of the screen: clear of
 * the status bar, gesture bar and notch, and on touch screens a little
 * further from the glass, as the systems' own menus are.
 */
export function screenEdges(): ScreenEdges {
  const margin =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? 12 : 8;
  if (typeof document === "undefined") {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;inset:0;visibility:hidden;pointer-events:none;" +
      "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  }
  if (!probe.isConnected) document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  return {
    top: Number.parseFloat(style.paddingTop) + margin,
    right: Number.parseFloat(style.paddingRight) + margin,
    bottom: Number.parseFloat(style.paddingBottom) + margin,
    left: Number.parseFloat(style.paddingLeft) + margin,
  };
}
