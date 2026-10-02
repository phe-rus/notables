import { useMemo } from "react";
import { encode } from "uqr";
import { HIDDEN_INK } from "./reveal-hidden-mark";

/**
 * The hidden mark, drawn as a large, pale yellow code behind the page's
 * content. It prints with the document and survives a photo, but is easy
 * to overlook; regenerating or retyping the page loses it.
 */
export function HiddenMark({
  value,
  size = 230,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const { path, modules } = useMemo(() => {
    const { data, size: count } = encode(value, { ecc: "Q", border: 0 });
    let d = "";
    data.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      });
    });
    return { path: d, modules: count };
  }, [value]);

  return (
    <svg
      aria-hidden="true"
      viewBox={`-3 -3 ${modules + 6} ${modules + 6}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={path} fill={HIDDEN_INK} />
    </svg>
  );
}
