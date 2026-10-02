import { HIGHLIGHT_COLORS, type HighlightEntry } from "../store/highlight-store";
import { locateQuote } from "./text-quote";
import { rangeFromOffsets, textOf } from "./text-ranges";

/** Chapter sections carry their note id, so quotes are found per chapter. */
export const CHAPTER_ATTRIBUTE = "data-chapter";

export const highlightName = (color: string) => `nt-highlight-${color}`;

/** Anything that can be searched for chapter sections. */
export type Searchable = { querySelectorAll(selectors: string): NodeListOf<Element> };

export const highlightsSupported = () =>
  typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

/** Every place a highlight appears under `root`; a chapter can be on screen more than once. */
export function rangesFor(root: Searchable, entry: HighlightEntry): Range[] {
  const ranges: Range[] = [];
  for (const section of root.querySelectorAll(`[${CHAPTER_ATTRIBUTE}="${entry.noteId}"]`)) {
    const found = locateQuote(textOf(section), entry.quote);
    const range = found && rangeFromOffsets(section, found.start, found.end);
    if (range) ranges.push(range);
  }
  return ranges;
}

/**
 * Draws highlights with the CSS Custom Highlight API: no markup changes,
 * so the page layout and the text itself stay untouched.
 */
export function paintHighlights(root: Searchable, entries: HighlightEntry[]) {
  if (!highlightsSupported()) return;
  for (const color of HIGHLIGHT_COLORS) {
    const ranges = entries
      .filter((entry) => entry.color === color)
      .flatMap((entry) => rangesFor(root, entry));
    CSS.highlights.set(highlightName(color), new Highlight(...ranges));
  }
}

export function clearHighlights() {
  if (!highlightsSupported()) return;
  for (const color of HIGHLIGHT_COLORS) CSS.highlights.delete(highlightName(color));
}
