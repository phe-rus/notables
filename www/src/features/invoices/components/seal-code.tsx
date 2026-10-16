import { useMemo } from "react";
import { encode } from "uqr";

/**
 * The seal as a QR code. Drawn as one SVG path so it prints crisply at any
 * size; the ink can take the document's accent while staying scannable.
 */
export function SealCode({
  value,
  size = 96,
  ink = "#1c1c1e",
  className,
}: {
  value: string;
  size?: number;
  ink?: string;
  className?: string;
}) {
  const { path, modules } = useMemo(() => {
    const { data, size: count } = encode(value, { ecc: "M", border: 0 });
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
      viewBox={`-4 -4 ${modules + 8} ${modules + 8}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      // Artwork, not an icon: the app's two-tone icon style would fade it.
      data-brand=""
      className={className}
      role="img"
      aria-label="Verification code"
    >
      {/* The standard four-module quiet zone, so cameras find the code. */}
      <rect x="-4" y="-4" width={modules + 8} height={modules + 8} fill="#fff" />
      <path d={path} fill={ink} />
    </svg>
  );
}
