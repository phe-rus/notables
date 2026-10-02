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
  height: number;
  hasEOL?: boolean;
}

/** Rebuilds paragraphs from positioned text: new lines by y, breaks at large gaps. */
export function paragraphsFrom(items: TextItem[]): string[] {
  const lines: Array<{ y: number; text: string; height: number }> = [];
  for (const item of items) {
    const y = item.transform[5] ?? 0;
    const last = lines.at(-1);
    if (last && Math.abs(last.y - y) < Math.max(2, item.height * 0.4)) {
      last.text += item.str;
    } else {
      lines.push({ y, text: item.str, height: item.height || 10 });
    }
  }
  const gaps = lines.slice(1).map((line, index) => Math.abs((lines[index]?.y ?? 0) - line.y));
  const typical = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 12;

  const paragraphs: string[] = [];
  let current = "";
  lines.forEach((line, index) => {
    const text = line.text.replace(/\s+/g, " ").trim();
    if (!text) return;
    const gap = index > 0 ? Math.abs((lines[index - 1]?.y ?? 0) - line.y) : 0;
    if (current && gap > typical * 1.45) {
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
  } else {
    for (let from = 0; from < total; from += PAGES_PER_CHAPTER) {
      const to = Math.min(total, from + PAGES_PER_CHAPTER);
      chapters.push({ title: `Pages ${from + 1}–${to}`, paragraphs: texts.slice(from, to).flat() });
    }
  }
  return { kind: "text", title, author, chapters };
}
