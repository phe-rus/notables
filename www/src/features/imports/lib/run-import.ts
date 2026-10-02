import type { NoteKind } from "@notables/core";
import { $appendContent, composeDocument, composeDocumentFromHtml } from "@notables/editor";
import { saveMedia } from "../../../platform/storage/media-store";
import { type BookFormat, getBookStore } from "../../books/store/book-store";
import { getSeriesStore } from "../../books/store/series-store";
import { writeNote } from "../../library/lib/write-note";
import { readComicArchive } from "../importers/read-comic-archive";
import { readEpub } from "../importers/read-epub";
import { readPdf } from "../importers/read-pdf";
import {
  type ImportPlan,
  type PlannedBook,
  type PlannedSeries,
  plannedBookTitle,
} from "./import-plan";

export interface ImportOptions {
  /** Comics are filed as manga (and read right to left) or comics. */
  comicKind: "manga" | "comic";
  /** Original files by their path in the plan. */
  files: Map<string, File>;
  onProgress?: (label: string, done: number, total: number) => void;
}

export interface ImportResult {
  bookIds: string[];
  chapters: number;
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );

const pagesHtml = (mediaIds: string[]) =>
  mediaIds.map((id) => `<img src="media:${id}" alt="">`).join("");

const paragraphsHtml = (paragraphs: string[]) =>
  paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");

/** How long an audio file plays, read from its metadata. */
function audioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (ms: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(ms) ? Math.round(ms) : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration * 1000);
    audio.onerror = () => done(0);
    setTimeout(() => done(0), 8000);
    audio.src = url;
  });
}

const kindFor = (format: BookFormat, options: ImportOptions): NoteKind =>
  format === "comic" ? options.comicKind : format === "audio" ? "note" : "story";

/** Total steps, for progress: one per chapter or container file. */
function countSteps(plan: ImportPlan): number {
  return plan.series
    .flatMap((series) => series.books)
    .reduce((sum, book) => sum + (book.container ? 1 : book.chapters.length), 0);
}

/**
 * Carries out an import plan: series, books and chapter notes, with every
 * image and recording saved to the device. Chapters belong to their book
 * and stay out of note lists.
 */
export async function runImport(plan: ImportPlan, options: ImportOptions): Promise<ImportResult> {
  const total = Math.max(1, countSteps(plan));
  let done = 0;
  let chapterCount = 0;
  const step = (label: string) => {
    done += 1;
    options.onProgress?.(label, done, total);
  };
  const fileFor = (path: string) => {
    const file = options.files.get(path);
    if (!file) throw new Error(`Missing file: ${path}`);
    return file;
  };

  const bookIds: string[] = [];
  for (const series of plan.series) {
    const seriesEntry = needsSeries(series)
      ? getSeriesStore().create({
          title: series.title,
          author: "",
          format: series.format,
          partLabel: series.partLabel,
        })
      : null;

    for (const planned of series.books) {
      const book = getBookStore().create();
      bookIds.push(book.id);
      const chapterIds: string[] = [];
      const write: WriteChapter = async (title, format, content) => {
        const note = await writeNote({
          kind: kindFor(format, options),
          bookId: book.id,
          compose: (doc) =>
            "html" in content
              ? composeDocumentFromHtml(doc, content.html, title)
              : composeDocument(doc, () => $appendContent({ title, audioClip: content.audio })),
        });
        chapterIds.push(note.id);
        chapterCount += 1;
      };
      const details = await importBookContent(planned, series, options, fileFor, write, step);
      if (seriesEntry && details.author && !seriesEntry.author) {
        getSeriesStore().update(seriesEntry.id, { author: details.author });
      }
      getBookStore().update(book.id, {
        title: details.title || plannedBookTitle(series, planned),
        author: details.author,
        format: details.format,
        direction: details.format === "comic" && options.comicKind === "manga" ? "rtl" : "ltr",
        cover: details.cover,
        seriesId: seriesEntry?.id ?? null,
        volume: planned.volume,
        chapterIds,
      });
    }
  }
  return { bookIds, chapters: chapterCount };
}

function needsSeries(series: PlannedSeries): boolean {
  return series.books.length > 1 || series.books.some((book) => book.volume !== null);
}

interface BookDetails {
  title: string;
  author: string;
  format: BookFormat;
  cover: string | null;
}

/** A chapter's content: HTML (text, pictures, pages) or a recording. */
type ChapterContent = { html: string } | { audio: { src: string; durationMs: number } };
type WriteChapter = (title: string, format: BookFormat, content: ChapterContent) => Promise<void>;

async function importBookContent(
  planned: PlannedBook,
  _series: PlannedSeries,
  options: ImportOptions,
  fileFor: (path: string) => File,
  write: WriteChapter,
  step: (label: string) => void,
): Promise<BookDetails> {
  const container = planned.container;

  if (container && planned.containerKind === "epub") {
    const epub = readEpub(new Uint8Array(await fileFor(container.path).arrayBuffer()));
    const saved = new Map<string, string>();
    const mediaFor = async (path: string) => {
      const known = saved.get(path);
      if (known) return known;
      const image = epub.images.get(path);
      if (!image) return null;
      const id = await saveMedia(new Blob([image.bytes as BlobPart], { type: image.type }));
      saved.set(path, id);
      return id;
    };
    for (const chapter of epub.chapters) {
      let html = chapter.html;
      for (const path of epub.images.keys()) {
        if (!html.includes(path)) continue;
        const id = await mediaFor(path);
        if (id) html = html.split(`src="${path}"`).join(`src="media:${id}"`);
      }
      await write(chapter.title, "prose", { html });
    }
    step(epub.title);
    const cover = epub.cover
      ? `media:${await saveMedia(new Blob([epub.cover.bytes as BlobPart], { type: epub.cover.type }))}`
      : null;
    return { title: epub.title, author: epub.author, format: "prose", cover };
  }

  if (container && planned.containerKind === "pdf") {
    const content = await readPdf(
      new Uint8Array(await fileFor(container.path).arrayBuffer()),
      (page, pages) =>
        options.onProgress?.(`${planned.title}: page ${page} of ${pages}`, page, pages),
    );
    step(planned.title);
    if (content.kind === "pages") {
      const ids = await Promise.all(content.pages.map((page) => saveMedia(page)));
      await write(planned.title, "comic", { html: pagesHtml(ids) });
      return {
        title: content.title,
        author: content.author,
        format: "comic",
        cover: ids[0] ? `media:${ids[0]}` : null,
      };
    }
    for (const chapter of content.chapters) {
      await write(chapter.title, "prose", { html: paragraphsHtml(chapter.paragraphs) });
    }
    return { title: content.title, author: content.author, format: "prose", cover: null };
  }

  if (container && planned.containerKind === "archive") {
    const chapters = readComicArchive(new Uint8Array(await fileFor(container.path).arrayBuffer()));
    let cover: string | null = null;
    for (const chapter of chapters) {
      const ids: string[] = [];
      for (const page of chapter.pages) {
        ids.push(await saveMedia(new Blob([page.bytes as BlobPart], { type: page.type })));
      }
      cover ??= ids[0] ? `media:${ids[0]}` : null;
      await write(chapter.title, "comic", { html: pagesHtml(ids) });
    }
    step(planned.title);
    return { title: "", author: "", format: "comic", cover };
  }

  if (planned.format === "audio") {
    for (const chapter of planned.chapters) {
      const file = chapter.files[0];
      if (!file) continue;
      const blob = fileFor(file.path);
      const [id, durationMs] = await Promise.all([saveMedia(blob), audioDuration(blob)]);
      await write(chapter.title, "audio", { audio: { src: `media:${id}`, durationMs } });
      step(chapter.title);
    }
    return { title: "", author: "", format: "audio", cover: null };
  }

  // Folders of page images.
  let cover: string | null = null;
  for (const chapter of planned.chapters) {
    const ids: string[] = [];
    for (const page of chapter.files) ids.push(await saveMedia(fileFor(page.path)));
    cover ??= ids[0] ? `media:${ids[0]}` : null;
    await write(chapter.title, "comic", { html: pagesHtml(ids) });
    step(chapter.title);
  }
  return { title: "", author: "", format: "comic", cover };
}
