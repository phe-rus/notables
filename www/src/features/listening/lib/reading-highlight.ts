import { highlightsSupported } from "../../books/highlights/lib/paint-highlights";
import { rangeFromOffsets } from "../../books/highlights/lib/text-ranges";
import type { ScriptLine } from "./narration-script";

const NAME = "nt-reading";

/** Where a line sits under `root`; a chapter can be on screen more than once. */
export function rangesForLine(
  root: Element,
  line: ScriptLine,
  sectionAttribute = "data-chapter",
): Range[] {
  const sections = line.section
    ? [...root.querySelectorAll(`[${sectionAttribute}="${line.section}"]`)]
    : [root];
  return sections
    .map((section) => rangeFromOffsets(section, line.start, line.end))
    .filter((range): range is Range => range !== null);
}

/** Marks the sentence being read, without touching the page's markup. */
export function paintReading(ranges: Range[]) {
  if (!highlightsSupported()) return;
  CSS.highlights.set(NAME, new Highlight(...ranges));
}

export function clearReading() {
  if (!highlightsSupported()) return;
  CSS.highlights.delete(NAME);
}
