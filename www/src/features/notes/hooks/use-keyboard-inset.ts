import { type RefObject, useEffect, useState } from "react";

/** iOS shrinks the visual viewport; Android already resizes the editor pane. */
export function useKeyboardInset(pane: RefObject<HTMLElement | null>) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bottom = pane.current?.getBoundingClientRect().bottom ?? window.innerHeight;
        const visible = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        pane.current?.style.setProperty(
          "--nt-menu-height",
          `${Math.max(120, visible - (pane.current?.getBoundingClientRect().top ?? 0) - 120)}px`,
        );
        setInset(Math.max(0, Math.round(bottom - visible)));
      });
    };
    measure();
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [pane]);
  return inset;
}
