import { offsetsFromRange, textOf } from "../../books/highlights/lib/text-ranges";

/** One sentence to read, located by character offsets within its section. */
export interface ScriptLine {
  /** The section's `data-chapter` value, or "" for a single section. */
  section: string;
  start: number;
  end: number;
  text: string;
}

const BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, pre, td, th";

function sentences(text: string, lang: string): Array<{ index: number; segment: string }> {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
    return [...segmenter.segment(text)].map(({ index, segment }) => ({ index, segment }));
  }
  // Older engines: split after sentence punctuation.
  const out: Array<{ index: number; segment: string }> = [];
  const pattern = /[^.!?…]+[.!?…]*["”’)]*\s*/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    out.push({ index: match.index, segment: match[0] });
  }
  return out;
}

/**
 * The sentences under `root`, in reading order, block by block so a
 * heading never runs into the paragraph after it. Sections marked with
 * `sectionAttribute` keep their own offsets, for highlighting.
 */
export function buildScript(
  root: Element,
  lang: string,
  sectionAttribute = "data-chapter",
): ScriptLine[] {
  const marked = [...root.querySelectorAll(`[${sectionAttribute}]`)];
  const sections = marked.length > 0 ? marked : [root];
  const lines: ScriptLine[] = [];
  for (const section of sections) {
    const id = section.getAttribute(sectionAttribute) ?? "";
    const blocks = [...section.querySelectorAll(BLOCKS)].filter(
      // Only the innermost blocks (a quote's paragraphs, not the quote too),
      // and nothing marked as not for reading, like a note's date.
      (block) => !block.querySelector(BLOCKS) && !block.closest("[data-read-aloud-skip]"),
    );
    for (const block of blocks) {
      const range = block.ownerDocument.createRange();
      range.selectNodeContents(block);
      const offsets = offsetsFromRange(section, range);
      if (!offsets) continue;
      const text = textOf(block);
      for (const { index, segment } of sentences(text, lang)) {
        const trimmed = segment.trim();
        if (!/[\p{L}\p{N}]/u.test(trimmed)) continue;
        const lead = segment.length - segment.trimStart().length;
        lines.push({
          section: id,
          start: offsets.start + index + lead,
          end: offsets.start + index + lead + trimmed.length,
          text: trimmed,
        });
      }
    }
  }
  return lines;
}
