import type { BookEntry, Part } from "../store/book-store";

export interface OutlineSection {
  /** The part these chapters belong to; none for chapters before the first part. */
  part?: Part;
  chapterIds: string[];
}

/** Part markers that still point at a chapter, in chapter order. */
export function validParts(book: Pick<BookEntry, "parts" | "chapterIds">): Part[] {
  const position = new Map(book.chapterIds.map((id, index) => [id, index]));
  const seen = new Set<string>();
  return (book.parts ?? [])
    .filter((part) => {
      if (!position.has(part.startsAt) || seen.has(part.startsAt)) return false;
      seen.add(part.startsAt);
      return true;
    })
    .sort((a, b) => (position.get(a.startsAt) ?? 0) - (position.get(b.startsAt) ?? 0));
}

/**
 * A book's live chapters in reading order, grouped by part. A part whose
 * first chapter is in the bin starts at its first live chapter; a part
 * with no live chapter isn't shown.
 */
export function chapterOutline(
  book: Pick<BookEntry, "parts" | "chapterIds">,
  isLive: (chapterId: string) => boolean,
): OutlineSection[] {
  const starts = new Map(validParts(book).map((part) => [part.startsAt, part]));
  const sections: OutlineSection[] = [];
  let current: OutlineSection = { chapterIds: [] };
  for (const id of book.chapterIds) {
    const part = starts.get(id);
    if (part) {
      if (current.part || current.chapterIds.length > 0) sections.push(current);
      current = { part, chapterIds: [] };
    }
    if (isLive(id)) current.chapterIds.push(id);
  }
  if (current.part || current.chapterIds.length > 0) sections.push(current);
  return sections.filter((section) => section.chapterIds.length > 0);
}

/** The part each live chapter opens, keyed by chapter id. */
export function partOpenings(
  book: Pick<BookEntry, "parts" | "chapterIds">,
  isLive: (chapterId: string) => boolean,
): Map<string, Part> {
  const openings = new Map<string, Part>();
  for (const section of chapterOutline(book, isLive)) {
    const first = section.chapterIds[0];
    if (section.part && first) openings.set(first, section.part);
  }
  return openings;
}

/**
 * Keeps part markers right when a chapter leaves: a part that started at
 * it starts at the next chapter that was in it, or goes if it had no other.
 */
export function partsWithout(
  book: Pick<BookEntry, "parts" | "chapterIds">,
  removed: string,
): Part[] {
  const parts = validParts(book);
  const starts = new Set(parts.map((part) => part.startsAt));
  const at = book.chapterIds.indexOf(removed);
  return parts.flatMap((part) => {
    if (part.startsAt !== removed) return [part];
    const next = book.chapterIds[at + 1];
    return next && !starts.has(next) ? [{ ...part, startsAt: next }] : [];
  });
}

type Arrangement = Pick<BookEntry, "parts" | "chapterIds">;

/** Where each part's chapters sit in `chapterIds`: from `start` up to, not including, `end`. */
export function partSpans(book: Arrangement): { part: Part; start: number; end: number }[] {
  const parts = validParts(book);
  return parts.map((part, index) => {
    const next = parts[index + 1];
    return {
      part,
      start: book.chapterIds.indexOf(part.startsAt),
      end: next ? book.chapterIds.indexOf(next.startsAt) : book.chapterIds.length,
    };
  });
}

/**
 * Moves a chapter to the end of a part, or with `partId` null to the end of
 * the chapters before the first part. A part that started at the chapter
 * starts at its next one, or goes; moving into that same, now empty, part
 * changes nothing.
 */
export function withChapterMoved(
  book: Arrangement,
  chapterId: string,
  partId: string | null,
): Arrangement {
  if (!book.chapterIds.includes(chapterId)) return book;
  const rest = {
    chapterIds: book.chapterIds.filter((id) => id !== chapterId),
    parts: partsWithout(book, chapterId),
  };
  const spans = partSpans(rest);
  let at: number;
  if (partId === null) {
    at = spans[0]?.start ?? rest.chapterIds.length;
  } else {
    const span = spans.find((entry) => entry.part.id === partId);
    if (!span) return book;
    at = span.end;
  }
  const chapterIds = [...rest.chapterIds];
  chapterIds.splice(at, 0, chapterId);
  return { chapterIds, parts: rest.parts };
}

/** Swaps a part, with all its chapters, with the part before (-1) or after (1) it. */
export function withPartMoved(book: Arrangement, partId: string, step: 1 | -1): Arrangement {
  const spans = partSpans(book);
  const index = spans.findIndex((span) => span.part.id === partId);
  const first = spans[step === 1 ? index : index - 1];
  const second = spans[step === 1 ? index + 1 : index];
  if (index < 0 || !first || !second) return book;
  const ids = book.chapterIds;
  return {
    chapterIds: [
      ...ids.slice(0, first.start),
      ...ids.slice(second.start, second.end),
      ...ids.slice(first.start, first.end),
      ...ids.slice(second.end),
    ],
    parts: book.parts,
  };
}

/** Puts new chapters at the end of a part, or of the whole item when there's no part. */
export function withChaptersInserted(
  book: Arrangement,
  added: string[],
  partId: string | null,
): string[] {
  const span = partId ? partSpans(book).find((entry) => entry.part.id === partId) : undefined;
  const at = span ? span.end : book.chapterIds.length;
  return [...book.chapterIds.slice(0, at), ...added, ...book.chapterIds.slice(at)];
}

/**
 * Swaps two chapters of the same part. A part that opened at one of them
 * opens at whichever now comes first, so neither leaves its part.
 */
export function withChaptersSwapped(book: Arrangement, a: string, b: string): Arrangement {
  const from = book.chapterIds.indexOf(a);
  const to = book.chapterIds.indexOf(b);
  if (from < 0 || to < 0) return book;
  const chapterIds = [...book.chapterIds];
  chapterIds[from] = b;
  chapterIds[to] = a;
  const firstNow = from < to ? b : a;
  const parts = book.parts?.map((part) =>
    part.startsAt === a || part.startsAt === b ? { ...part, startsAt: firstNow } : part,
  );
  return { chapterIds, parts };
}
