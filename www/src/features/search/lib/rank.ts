/** Something that can be found: a note or a book. */
export interface Searchable {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

export interface SearchHit<T extends Searchable = Searchable> {
  item: T;
  score: number;
  /** A short passage around the first body match, if the body matched. */
  snippet: { text: string; matches: Array<[start: number, end: number]> } | null;
}

/**
 * Lowercases and strips accents one character at a time, so positions in
 * the folded text match the original (needed to highlight matches).
 */
const fold = (text: string) =>
  Array.from(text, (char) => {
    const bare = char
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
    return bare.length === char.length ? bare : char.toLowerCase();
  }).join("");

export function terms(query: string): string[] {
  return [
    ...new Set(
      fold(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean),
    ),
  ];
}

const wordStart = (text: string, index: number) =>
  index === 0 || !/[\p{L}\p{N}]/u.test(text[index - 1] ?? "");

/** Occurrences of `term` in `text`, and how many start a word. */
function occurrences(text: string, term: string) {
  let count = 0;
  let starts = 0;
  let first = -1;
  for (let at = text.indexOf(term); at !== -1; at = text.indexOf(term, at + term.length)) {
    if (first === -1) first = at;
    count += 1;
    if (wordStart(text, at)) starts += 1;
  }
  return { count, starts, first };
}

const DAY = 86_400_000;
const SNIPPET_RADIUS = 60;

/**
 * Finds items containing every term (as a word prefix or anywhere) and
 * ranks them: title matches first, whole-word matches over fragments, more
 * matches over fewer, and recent edits as a tie-breaker.
 */
export function search<T extends Searchable>(items: T[], query: string, now = Date.now()) {
  const wanted = terms(query);
  if (wanted.length === 0) return [];
  const hits: SearchHit<T>[] = [];

  for (const item of items) {
    const title = fold(item.title);
    const body = fold(item.body);
    let score = 0;
    let matchedAll = true;
    let firstBodyMatch = -1;

    for (const term of wanted) {
      const inTitle = occurrences(title, term);
      const inBody = occurrences(body, term);
      if (inTitle.count === 0 && inBody.count === 0) {
        matchedAll = false;
        break;
      }
      score += inTitle.starts * 12 + (inTitle.count - inTitle.starts) * 5;
      score += Math.min(inBody.starts, 8) * 2 + Math.min(inBody.count - inBody.starts, 8) * 0.5;
      if (inBody.first !== -1 && (firstBodyMatch === -1 || inBody.first < firstBodyMatch)) {
        firstBodyMatch = inBody.first;
      }
    }
    if (!matchedAll) continue;
    if (title === fold(query).trim()) score += 20;
    // Recent notes edge ahead: up to +3 for today, fading over a month.
    score += 3 * Math.max(0, 1 - (now - item.updatedAt) / (30 * DAY));

    hits.push({
      item,
      score,
      snippet: firstBodyMatch === -1 ? null : snippet(item.body, body, firstBodyMatch, wanted),
    });
  }

  return hits.sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt);
}

function snippet(original: string, folded: string, at: number, wanted: string[]) {
  // Folding keeps lengths, except for the odd character whose case changes length.
  const source = original.length === folded.length ? original : folded;
  let start = Math.max(0, at - SNIPPET_RADIUS);
  let end = Math.min(source.length, at + SNIPPET_RADIUS * 2);
  if (start > 0) start = source.indexOf(" ", start) + 1 || start;
  if (end < source.length)
    end = source.lastIndexOf(" ", end) > at ? source.lastIndexOf(" ", end) : end;

  const prefix = start > 0 ? "…" : "";
  const text = `${prefix}${source.slice(start, end).replace(/\s+/g, " ")}${end < source.length ? "…" : ""}`;
  const lower = fold(text);
  const matches: Array<[number, number]> = [];
  for (const term of wanted) {
    for (let i = lower.indexOf(term); i !== -1; i = lower.indexOf(term, i + term.length)) {
      matches.push([i, i + term.length]);
    }
  }
  matches.sort((a, b) => a[0] - b[0]);
  return { text, matches };
}
