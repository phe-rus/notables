import { type RefObject, useEffect } from "react";
import type { HighlightEntry } from "../store/highlight-store";
import { clearHighlights, paintHighlights } from "./paint-highlights";

/** Keeps highlights drawn as pages turn and new faces render. */
export function usePaintedHighlights(
  root: RefObject<HTMLElement | null>,
  entries: HighlightEntry[],
) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const repaint = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paintHighlights(element, entries));
    };
    repaint();
    const observer = new MutationObserver(repaint);
    observer.observe(element, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [root, entries]);

  useEffect(() => clearHighlights, []);
}
