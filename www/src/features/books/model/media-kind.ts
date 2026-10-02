import type { BookEntry, BookFormat } from "../store/book-store";
import type { SeriesEntry } from "../store/series-store";

/** What an item in the Books area is. Each kind has its own shelf and tools. */
export type MediaKind = "book" | "comic" | "manga" | "audiobook";

/** The order kinds are listed and sorted in. */
export const mediaKinds: readonly MediaKind[] = ["book", "comic", "manga", "audiobook"];

export const isMediaKind = (value: unknown): value is MediaKind =>
  mediaKinds.includes(value as MediaKind);

type Direction = "ltr" | "rtl";

/** The kind older entries imply: prose is a book, a right to left comic is manga. */
export function kindFromFormat(format: BookFormat | undefined, direction?: Direction): MediaKind {
  if (format === "audio") return "audiobook";
  if (format === "comic") return direction === "rtl" ? "manga" : "comic";
  return "book";
}

export function formatOf(kind: MediaKind): BookFormat {
  return kind === "book" ? "prose" : kind === "audiobook" ? "audio" : "comic";
}

export function directionOf(kind: MediaKind): Direction {
  return kind === "manga" ? "rtl" : "ltr";
}

/** The stored fields a kind is written as, so older app versions keep reading it right. */
export const kindFields = (kind: MediaKind) => ({
  kind,
  format: formatOf(kind),
  direction: directionOf(kind),
});

/**
 * An item's own kind. A stored `kind` counts only while `format` and
 * `direction` still agree with it: an older app version on another device
 * changes those two and not `kind`, and its change wins.
 */
export function storedKind(book: Pick<BookEntry, "kind" | "format" | "direction">): MediaKind {
  const fallback = kindFromFormat(book.format, book.direction);
  const { kind } = book;
  if (!kind || !isMediaKind(kind)) return fallback;
  const format = book.format ?? "prose";
  const direction = book.direction ?? "ltr";
  return formatOf(kind) === format && directionOf(kind) === direction ? kind : fallback;
}

/** A series' kind: its own, else its first item's, else its old `format`. */
export function seriesKind(series: SeriesEntry, items: readonly BookEntry[] = []): MediaKind {
  if (series.kind && isMediaKind(series.kind)) return series.kind;
  const first = items.find((item) => item.seriesId === series.id);
  if (first) return storedKind(first);
  return kindFromFormat(series.format);
}

/** How an item is shown and read: a series decides for all its items. */
export function itemKind(
  book: BookEntry,
  series?: SeriesEntry,
  items: readonly BookEntry[] = [],
): MediaKind {
  return series && book.seriesId === series.id ? seriesKind(series, items) : storedKind(book);
}

/** Comics and manga are drawn pages, read a page at a time. */
export const isDrawnKind = (kind: MediaKind) => kind === "comic" || kind === "manga";
