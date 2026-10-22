import { useLayoutEffect, useState } from "react";

/** Lift tools only by the portion of the pane outside the visible viewport. */
export function useKeyboardInset() {
  const [pane, paneRef] = useState<HTMLElement | null>(null);
  const [inset, setInset] = useState(0);
  useLayoutEffect(() => {
    if (!pane) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bottom = pane.getBoundingClientRect().bottom ?? window.innerHeight;
        const visible = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        pane.style.setProperty(
          "--nt-menu-height",
          `${Math.max(120, visible - (pane.getBoundingClientRect().top ?? 0) - 120)}px`,
        );
        setInset(Math.max(0, Math.round(bottom - visible)));
      });
    };
    // The shell applies its viewport height in a separate render. Measure again
    // after that layout settles, rather than retaining the old keyboard offset.
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    measure();
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [pane]);
  return { inset, paneRef };
}
