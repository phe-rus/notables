import type { ReactNode } from "react";

/** Text with the given ranges marked; overlapping ranges are merged. */
export function HighlightedText({
  text,
  matches,
}: {
  text: string;
  matches: Array<[number, number]>;
}) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of matches) {
    if (end <= cursor) continue;
    const from = Math.max(start, cursor);
    if (from > cursor) parts.push(text.slice(cursor, from));
    parts.push(
      <mark key={from} className="rounded-xs bg-accent-soft px-px text-label">
        {text.slice(from, end)}
      </mark>,
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
