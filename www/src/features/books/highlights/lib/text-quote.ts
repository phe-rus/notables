/**
 * Highlights are anchored by quote, not position: the words themselves
 * plus a little context either side. Re-paginating, resizing or small
 * edits elsewhere in a chapter don't move them.
 */
export interface TextQuote {
  exact: string;
  prefix: string;
  suffix: string;
  /** Where the quote started when made; breaks ties between repeats. */
  offset: number;
}

const CONTEXT = 32;

export function quoteFor(text: string, start: number, end: number): TextQuote {
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    offset: start,
  };
}

/** Characters shared at the end of `a` and the end of `b`. */
function commonSuffix(a: string, b: string): number {
  let count = 0;
  while (
    count < a.length &&
    count < b.length &&
    a[a.length - 1 - count] === b[b.length - 1 - count]
  )
    count++;
  return count;
}

function commonPrefix(a: string, b: string): number {
  let count = 0;
  while (count < a.length && count < b.length && a[count] === b[count]) count++;
  return count;
}

/**
 * Finds a quote in `text`: of every place the exact words appear, the one
 * whose surroundings match best, then the one nearest where it was.
 */
export function locateQuote(text: string, quote: TextQuote): { start: number; end: number } | null {
  if (!quote.exact) return null;
  let best: { start: number; score: number; distance: number } | null = null;
  for (let at = text.indexOf(quote.exact); at !== -1; at = text.indexOf(quote.exact, at + 1)) {
    const score =
      commonSuffix(text.slice(Math.max(0, at - quote.prefix.length), at), quote.prefix) +
      commonPrefix(text.slice(at + quote.exact.length), quote.suffix);
    const distance = Math.abs(at - quote.offset);
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { start: at, score, distance };
    }
  }
  return best ? { start: best.start, end: best.start + quote.exact.length } : null;
}
