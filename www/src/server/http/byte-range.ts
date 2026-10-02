/** A byte range as the client asked for it, before the file size is known. */
export type RangeRequest = { start: number; end?: number } | { suffix: number };

/** A satisfiable range, resolved against the file size. */
export interface ByteRange {
  offset: number;
  length: number;
}

/**
 * Parses a single `bytes=start-end`, `bytes=start-` or `bytes=-suffix` range.
 * Anything else (several ranges, other units, garbage) returns undefined, and
 * the whole file is served, as RFC 9110 allows.
 */
export function parseRange(header: string | null): RangeRequest | undefined {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return undefined;
  const [, start, end] = match;
  if (start) {
    const from = Number(start);
    if (!end) return { start: from };
    const to = Number(end);
    return to < from ? undefined : { start: from, end: to };
  }
  return end ? { suffix: Number(end) } : undefined;
}

/** Resolves a range against the file size; null when it can't be satisfied. */
export function resolveRange(range: RangeRequest, size: number): ByteRange | null {
  if ("suffix" in range) {
    if (range.suffix === 0 || size === 0) return null;
    const length = Math.min(range.suffix, size);
    return { offset: size - length, length };
  }
  if (range.start >= size) return null;
  const last = Math.min(range.end ?? size - 1, size - 1);
  return { offset: range.start, length: last - range.start + 1 };
}

/** The `Content-Range` value for a served range. */
export const contentRange = ({ offset, length }: ByteRange, size: number) =>
  `bytes ${offset}-${offset + length - 1}/${size}`;
