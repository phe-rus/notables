import { type RefObject, useLayoutEffect, useState } from "react";
import type { PageGeometry } from "./page-geometry";

/**
 * Counts the pages in a measured multi-column flow, re-measuring when
 * fonts or images finish loading and whenever the geometry changes.
 */
export function usePageCount(
  /** Wrapper whose first child is the flow to measure. */
  flow: RefObject<HTMLElement | null>,
  geometry: PageGeometry | null,
  contentKey: unknown,
): number {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    const element = flow.current?.firstElementChild as HTMLElement | null;
    if (!element || !geometry) return;
    const step = geometry.textWidth + geometry.columnGap;
    const measure = () => {
      setCount(Math.max(1, Math.round((element.scrollWidth + geometry.columnGap) / step)));
    };
    measure();
    void document.fonts?.ready.then(measure);
    const images = [...element.querySelectorAll("img")];
    for (const image of images) image.addEventListener("load", measure);
    return () => {
      for (const image of images) image.removeEventListener("load", measure);
    };
  }, [flow, geometry, contentKey]);

  return count;
}
