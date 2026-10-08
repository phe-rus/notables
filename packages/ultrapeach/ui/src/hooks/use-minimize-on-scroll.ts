import { useEffect, useState } from "react";

/** How far to scroll, in one direction, before the bar changes. */
const THRESHOLD = 12;
/** Near the top of the content the bar is always full size. */
const TOP = 24;

/**
 * Minimized while you scroll down through content, restored when you scroll
 * back up or reach the top: iOS 26's `tabBarMinimizeBehavior(.onScrollDown)`.
 * Listens to every scroll container, since each screen scrolls its own pane.
 */
export function useMinimizeOnScroll() {
  const [minimized, setMinimized] = useState(false);
  useEffect(() => {
    const anchors = new WeakMap<Element, number>();
    const onScroll = (event: Event) => {
      const pane = event.target instanceof Element ? event.target : document.scrollingElement;
      if (!pane) return;
      const top = pane.scrollTop;
      const anchor = anchors.get(pane);
      // A pane's first scroll only marks where it started.
      if (anchor === undefined) {
        anchors.set(pane, top);
        return;
      }
      const delta = top - anchor;
      if (top < TOP || delta < -THRESHOLD) setMinimized(false);
      else if (delta > THRESHOLD) setMinimized(true);
      else return;
      anchors.set(pane, top);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);
  return [minimized, setMinimized] as const;
}
