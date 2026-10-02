import { INK_WIDTH, type InkStroke, strokePath } from "./ink-model";

/** Handwriting as a static drawing: in read-only documents, books and published pages. */
export function InkView({
  strokes,
  height,
  live,
  className,
}: {
  strokes: InkStroke[];
  height: number;
  /** A stroke still being drawn. */
  live?: InkStroke | null;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${INK_WIDTH} ${height}`}
      className={className ?? "nt-ink"}
      role="img"
      aria-label="Handwriting"
      preserveAspectRatio="xMidYMin meet"
    >
      {strokes.map((stroke, index) => (
        <path
          // Strokes only ever append or disappear as a whole.
          key={index}
          d={strokePath(stroke)}
          className={`nt-ink-${stroke.tool} nt-ink-color-${stroke.color}`}
        />
      ))}
      {live && (
        <path
          d={strokePath(live, true)}
          className={`nt-ink-${live.tool} nt-ink-color-${live.color}`}
        />
      )}
    </svg>
  );
}
