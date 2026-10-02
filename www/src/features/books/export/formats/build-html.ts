import { directionOf } from "../../model/media-kind";
import { type BookMaterial, isDrawnBook } from "../book-material";
import { renderChapterBody } from "../build-epub";
import { contentsList } from "../contents-list";
import { epubStylesheet } from "../epub-stylesheet";
import { dataUrl, MediaFiles } from "../media-files";
import { escapeXml } from "../xml";

/** Replaces every media source with the file itself, so the page stands alone. */
async function inlineMedia(document: unknown, media: MediaFiles): Promise<unknown> {
  if (Array.isArray(document)) return Promise.all(document.map((item) => inlineMedia(item, media)));
  if (!document || typeof document !== "object") return document;
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(document)) {
    if (key === "src" && typeof value === "string" && !/^https?:/i.test(value)) {
      const file = await media.add(value);
      copy[key] = file ? dataUrl(file) : "";
    } else {
      copy[key] = await inlineMedia(value, media);
    }
  }
  return copy;
}

const pageStyles = `
:root { color-scheme: light dark; }
body { max-width: 38em; margin: 0 auto; padding: 4em 1.5em 6em; color: #1c1a17; background: #fffdf8; font-size: 1.15em; }
@media (prefers-color-scheme: dark) { body { color: #ece6dc; background: #171513; } .chapter-number { color: #e8b14a; } }
header { text-align: center; margin: 4em 0 6em; }
header h1 { font-size: 2.4em; margin: 0 0 0.3em; }
nav ol { line-height: 2; }
nav a { color: inherit; }
.chapter { margin-top: 6em; }
.part { margin: 8em 0 0; text-align: center; font-size: 2.2em; }
nav ol ol { padding-inline-start: 1.25em; }
.comic figure { margin: 0 0 1.5em; }
.comic img { width: 100%; box-shadow: 0 1px 4px rgb(0 0 0 / 0.2); }
audio { width: 100%; }
`;

/** A single web page that opens in any browser, with pictures and recordings inside it. */
export async function buildHtml(material: BookMaterial): Promise<string> {
  const media = new MediaFiles();
  const comic = isDrawnBook(material.book);
  const chapters: string[] = [];
  for (const [index, chapter] of material.chapters.entries()) {
    const body = chapter.document
      ? renderChapterBody(await inlineMedia(chapter.document, media))
      : `<p class="missing">This chapter wasn’t available on this device.</p>`;
    if (chapter.part) chapters.push(`<h1 class="part">${escapeXml(chapter.part.title)}</h1>`);
    chapters.push(
      `<section class="chapter${comic ? " comic" : ""}" id="chapter-${index + 1}"><p class="chapter-number">Chapter ${index + 1}</p><h1>${escapeXml(chapter.title)}</h1>${body}</section>`,
    );
  }
  const contents = contentsList(material.chapters, (index) => `#chapter-${index + 1}`);
  return `<!doctype html>
<html lang="${document.documentElement.lang || "en"}"${directionOf(material.kind) === "rtl" && !comic ? ' dir="rtl"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Notables">
<title>${escapeXml(material.title)}</title>
<style>${epubStylesheet}${pageStyles}</style>
</head>
<body>
<header><h1>${escapeXml(material.title)}</h1>${material.book.subtitle ? `<p class="subtitle">${escapeXml(material.book.subtitle)}</p>` : ""}${material.author ? `<p class="author">${escapeXml(material.author)}</p>` : ""}</header>
${material.chapters.length > 1 ? `<nav><h2>Contents</h2>${contents}</nav>` : ""}
${chapters.join("\n")}
</body>
</html>`;
}
