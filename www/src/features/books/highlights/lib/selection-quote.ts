import type { HighlightEntry } from "../store/highlight-store";
import { CHAPTER_ATTRIBUTE, rangesFor } from "./paint-highlights";
import { locateQuote, quoteFor, type TextQuote } from "./text-quote";
import { offsetsFromRange, textOf } from "./text-ranges";

const chapterOf = (node: Node | null): Element | null =>
  (node instanceof Element ? node : node?.parentElement)?.closest(`[${CHAPTER_ATTRIBUTE}]`) ?? null;

/** The quote a selection makes, if it lies within one chapter. */
export function quoteFromRange(range: Range): { noteId: string; quote: TextQuote } | null {
  const section = chapterOf(range.startContainer);
  if (!section || section !== chapterOf(range.endContainer)) return null;
  const offsets = offsetsFromRange(section, range);
  const noteId = section.getAttribute(CHAPTER_ATTRIBUTE);
  if (!offsets || !noteId) return null;
  const text = textOf(section);
  // Leave out spaces caught at either edge.
  let { start, end } = offsets;
  while (start < end && /\s/.test(text[start] ?? "")) start++;
  while (end > start && /\s/.test(text[end - 1] ?? "")) end--;
  return end > start ? { noteId, quote: quoteFor(text, start, end) } : null;
}

/** The caret at a point on screen, across engines. */
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

/** The highlight under a point on screen, if any. */
export function highlightAt(
  x: number,
  y: number,
  entries: HighlightEntry[],
): { entry: HighlightEntry; range: Range } | null {
  const caret = caretAt(x, y);
  const section = chapterOf(caret?.node ?? null);
  if (!caret || !section) return null;
  const noteId = section.getAttribute(CHAPTER_ATTRIBUTE);
  const text = textOf(section);
  const before = document.createRange();
  before.selectNodeContents(section);
  before.setEnd(caret.node, caret.offset);
  const at = textOf(before.cloneContents()).length;
  for (const entry of entries) {
    if (entry.noteId !== noteId) continue;
    const found = locateQuote(text, entry.quote);
    if (found && at >= found.start && at <= found.end) {
      const range = rangesFor(section.parentElement ?? section, entry).find((candidate) =>
        section.contains(candidate.startContainer),
      );
      if (range) return { entry, range };
    }
  }
  return null;
}
