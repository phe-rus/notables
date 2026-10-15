/**
 * Reads a PDF with pdf.js, loaded only when a PDF is imported. Text PDFs
 * become chapters of paragraphs, split by the document's outline (or by
 * page ranges); scanned PDFs, such as comics, become page images.
 */

export interface PdfChapter {
  title: string;
  paragraphs: string[];
}

export type PdfContent =
  | { kind: "text"; title: string; author: string; chapters: PdfChapter[] }
  | { kind: "pages"; title: string; author: string; pages: Blob[] };

/** Below this many characters per page, a PDF is treated as scanned pages. */
const SCANNED_THRESHOLD = 80;
const PAGES_PER_CHAPTER = 10;
const PAGE_WIDTH_PX = 1400;

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfDocument = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;
type PdfPage = Awaited<ReturnType<PdfDocument["getPage"]>>;

let pdfjs: Promise<PdfJs> | undefined;
function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= (async () => {
    // The legacy build carries polyfills that system webviews (WebKitGTK,
    // older Safari) need; the modern build assumes the newest engines.
    const [library, worker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    ]);
    library.GlobalWorkerOptions.workerSrc = worker.default;
    return library;
  })();
  return pdfjs;
}

interface TextItem {
  str: string;
  transform: number[];
  width?: number;
  height: number;
  hasEOL?: boolean;
}

/**
 * Rebuilds paragraphs from positioned text. Lines are grouped by height on
 * the page; a paragraph ends at a wider gap than usual, before an indented
 * line, or after a line that stops short, the way novels mark paragraphs
 * (one block per page otherwise, contents lists and headings included).
 */
export function paragraphsFrom(items: TextItem[]): string[] {
  const lines: Array<{ y: number; x: number; right: number; text: string; height: number }> = [];
  for (const item of items) {
    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    const right = x + (item.width ?? 0);
    const last = lines.at(-1);
    if (last && Math.abs(last.y - y) < Math.max(2, item.height * 0.4)) {
      last.text += item.str;
      last.right = Math.max(last.right, right);
    } else {
      lines.push({ y, x, right, text: item.str, height: item.height || 10 });
    }
  }
  const median = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
  const gaps = lines.slice(1).map((line, index) => Math.abs((lines[index]?.y ?? 0) - line.y));
  const typical = median(gaps) || 12;
  const left = median(lines.map((line) => line.x));
  // Where full lines end: most lines of prose run to the margin.
  const rights = lines.map((line) => line.right).sort((a, b) => a - b);
  const margin = rights[Math.floor(rights.length * 0.8)] ?? 0;
  const measured = lines.some((line) => line.right > line.x);

  const paragraphs: string[] = [];
  let current = "";
  lines.forEach((line, index) => {
    const text = line.text.replace(/\s+/g, " ").trim();
    if (!text) return;
    const previous = lines[index - 1];
    const gap = previous ? Math.abs(previous.y - line.y) : 0;
    const indented = line.x > left + line.height * 0.8;
    const shortBefore = measured && previous ? previous.right < margin - line.height * 2 : false;
    if (current && (gap > typical * 1.45 || indented || shortBefore)) {
      paragraphs.push(current.trim());
      current = "";
    }
    // Join hyphenated words split across lines.
    current = current.endsWith("-")
      ? current.slice(0, -1) + text
      : current
        ? `${current} ${text}`
        : text;
  });
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs;
}

/** "Chapter 12: The Lamp", "Prologue", "Part Two", short and on its own. */
const HEADING = /^(?:chapter|prologue|epilogue|interlude|part|book|volume)\b[^.!?]{0,80}$/i;

/**
 * Chapter headings in a book without an outline: a heading counts only
 * when prose follows it, so a contents list's entries never split the book.
 * Positions are [page, paragraph].
 */
export function headingStarts(
  pages: string[][],
): Array<{ title: string; page: number; at: number }> {
  const flat = pages.flatMap((paragraphs, page) =>
    paragraphs.map((text, at) => ({ text, page, at })),
  );
  const starts: Array<{ title: string; page: number; at: number }> = [];
  flat.forEach((entry, index) => {
    if (!HEADING.test(entry.text)) return;
    // Prose within the next two paragraphs, before any other heading.
    const following = flat.slice(index + 1, index + 3);
    const stop = following.findIndex((next) => HEADING.test(next.text));
    const prose = (stop < 0 ? following : following.slice(0, stop)).some(
      (next) => next.text.length > 200,
    );
    if (prose) starts.push({ title: entry.text, page: entry.page, at: entry.at });
  });
  return starts;
}

async function pageText(page: PdfPage): Promise<TextItem[]> {
  const content = await page.getTextContent();
  // Marked-content markers carry no text.
  return content.items.filter((item) => "str" in item) as unknown as TextItem[];
}

async function renderPage(page: PdfPage): Promise<Blob> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: PAGE_WIDTH_PX / base.width });
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn’t draw this PDF’s pages.");
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn’t save a page."))),
      "image/jpeg",
      0.88,
    ),
  );
}

/** Top-level outline entries and the page each starts on. */
async function outlineStarts(pdf: PdfDocument): Promise<Array<{ title: string; page: number }>> {
  const outline = (await pdf.getOutline().catch(() => null)) ?? [];
  const starts: Array<{ title: string; page: number }> = [];
  for (const entry of outline) {
    try {
      const dest =
        typeof entry.dest === "string" ? await pdf.getDestination(entry.dest) : entry.dest;
      const ref = dest?.[0];
      if (!ref) continue;
      const page = typeof ref === "object" ? await pdf.getPageIndex(ref) : Number(ref);
      if (Number.isFinite(page)) starts.push({ title: entry.title.trim(), page });
    } catch {
      // Entries pointing nowhere are skipped.
    }
  }
  return starts.sort((a, b) => a.page - b.page);
}

export async function readPdf(
  bytes: Uint8Array,
  onProgress: (done: number, total: number) => void = () => {},
): Promise<PdfContent> {
  const library = await loadPdfJs();
  const task = library.getDocument({ data: bytes.slice() });
  const pdf = await task.promise;
  const meta = await pdf.getMetadata().catch(() => null);
  const info = (meta?.info ?? {}) as { Title?: string; Author?: string };
  const title = info.Title?.trim() || "";
  const author = info.Author?.trim() || "";
  const total = pdf.numPages;

  // Sample a few pages to tell text from scans.
  const sample = Math.min(total, 5);
  let characters = 0;
  for (let index = 1; index <= sample; index++) {
    characters += (await pageText(await pdf.getPage(index))).reduce(
      (sum, item) => sum + item.str.trim().length,
      0,
    );
  }

  if (characters / sample < SCANNED_THRESHOLD) {
    const pages: Blob[] = [];
    for (let index = 1; index <= total; index++) {
      pages.push(await renderPage(await pdf.getPage(index)));
      onProgress(index, total);
    }
    await task.destroy();
    return { kind: "pages", title, author, pages };
  }

  const texts: string[][] = [];
  for (let index = 1; index <= total; index++) {
    texts.push(paragraphsFrom(await pageText(await pdf.getPage(index))));
    onProgress(index, total);
  }
  const starts = await outlineStarts(pdf);
  await task.destroy();

  const chapters: PdfChapter[] = [];
  if (starts.length > 1) {
    if ((starts[0]?.page ?? 0) > 0) starts.unshift({ title: "Opening", page: 0 });
    starts.forEach((start, index) => {
      const end = starts[index + 1]?.page ?? total;
      const paragraphs = texts.slice(start.page, Math.max(start.page + 1, end)).flat();
      if (paragraphs.length)
        chapters.push({ title: start.title || `Chapter ${index + 1}`, paragraphs });
    });
  } else if (headingStarts(texts).length >= 3) {
    // No outline: split at the chapter headings in the text itself.
    const headings = headingStarts(texts);
    const flat = texts.flatMap((paragraphs, page) =>
      paragraphs.map((text, at) => ({ text, page, at })),
    );
    const indexOf = (heading: { page: number; at: number }) =>
      flat.findIndex((entry) => entry.page === heading.page && entry.at === heading.at);
    const first = indexOf(headings[0] as { page: number; at: number });
    if (first > 0)
      chapters.push({
        title: "Opening",
        paragraphs: flat.slice(0, first).map((entry) => entry.text),
      });
    headings.forEach((heading, index) => {
      const from = indexOf(heading);
      const next = headings[index + 1];
      const to = next ? indexOf(next) : flat.length;
      // The heading itself is the chapter's title, not its first paragraph.
      chapters.push({
        title: heading.title,
        paragraphs: flat.slice(from + 1, to).map((entry) => entry.text),
      });
    });
  } else {
    for (let from = 0; from < total; from += PAGES_PER_CHAPTER) {
      const to = Math.min(total, from + PAGES_PER_CHAPTER);
      chapters.push({ title: `Pages ${from + 1}–${to}`, paragraphs: texts.slice(from, to).flat() });
    }
  }
  return { kind: "text", title, author, chapters };
}
