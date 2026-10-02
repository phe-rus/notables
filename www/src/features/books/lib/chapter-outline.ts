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
