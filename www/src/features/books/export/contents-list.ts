import type { Part } from "../store/book-store";
import { escapeXml } from "./xml";

/**
 * A book's contents as nested lists: each part's chapters under its title,
 * chapters before the first part on their own.
 */
export function contentsList(
  chapters: ReadonlyArray<{ title: string; part?: Part }>,
  href: (index: number) => string,
): string {
  let html = "";
  let inPart = false;
  chapters.forEach((chapter, index) => {
    if (chapter.part) {
      if (inPart) html += "</ol></li>";
      html += `<li><span>${escapeXml(chapter.part.title)}</span><ol>`;
      inPart = true;
    }
    html += `<li><a href="${href(index)}">${escapeXml(chapter.title)}</a></li>`;
  });
  if (inPart) html += "</ol></li>";
  return `<ol>${html}</ol>`;
}
