import { createId, type NoteKind } from "@notables/core";
import { $appendContent, composeDocument, composeDocumentFromHtml } from "@notables/editor";
import { saveMedia } from "../../../platform/storage/media-store";
import { noteKindFor } from "../../books/actions/start-chapter";
import { syncBookFormat } from "../../books/actions/sync-book-format";
import { validParts } from "../../books/lib/chapter-outline";
import { formatOf } from "../../books/model/media-kind";
import { type BookFormat, getBookStore, type Part } from "../../books/store/book-store";
import { getSeriesStore } from "../../books/store/series-store";
import { writeNote } from "../../library/lib/write-note";
import { readComicArchive } from "../importers/read-comic-archive";
import { readEpub } from "../importers/read-epub";
import { readPdf } from "../importers/read-pdf";
import {
  buildImportPlan,
  type ImportFile,
  type ImportPlan,
  type PlannedBook,
  type PlannedSeries,
  plannedBookTitle,
} from "./import-plan";

export interface ImportOptions {
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

/** Total steps, for progress: one per chapter or container file. */
function countSteps(books: PlannedBook[]): number {
  return books.reduce((sum, book) => sum + (book.container ? 1 : book.chapters.length), 0);
}

/** The volumes a planned series really imports: those its merge target lacks. */
function booksToImport(series: PlannedSeries, merging: boolean): PlannedBook[] {
  if (!merging) return series.books;
  const skip = new Set(series.skippedVolumes);
  return series.books.filter((book) => book.volume === null || !skip.has(book.volume));
}

/** A merge goes ahead only into a live series that still has the same kind. */
function mergeTarget(series: PlannedSeries): string | null {
  if (!series.mergeInto || !series.merge) return null;
  const store = getSeriesStore();
  const target = store.series.get(series.mergeInto.id);
  return target && store.kindOf(target) === series.kind ? target.id : null;
}

/**
 * Carries out an import plan: series, books and chapter notes, with every
 * image and recording saved to the device. Each series imports as the kind
 * the preview settled on, joins the series it merges into, and can join a
 * franchise. Chapters belong to their book and stay out of note lists.
 */
export async function runImport(plan: ImportPlan, options: ImportOptions): Promise<ImportResult> {
  const work = plan.series.map((series) => {
    const target = mergeTarget(series);
    return { series, target, books: booksToImport(series, target !== null) };
  });
  const total = Math.max(1, countSteps(work.flatMap(({ books }) => books)));
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
  for (const { series, target, books } of work) {
    const franchiseId =
      !target && series.franchise && series.joinFranchise ? series.franchise.id : null;
    const seriesId =
      target ??
      (needsSeries(series) || franchiseId
        ? getSeriesStore().create({
            title: series.title,
            author: "",
            kind: series.kind,
            partLabel: series.partLabel,
            ...(franchiseId ? { franchiseId } : {}),
          }).id
        : null);

    for (const planned of books) {
      const book = getBookStore().create(series.kind);
      bookIds.push(book.id);
      const chapterIds: string[] = [];
      const write = chapterWriter(book.id, noteKindFor(series.kind), (id) => {
        chapterIds.push(id);
        chapterCount += 1;
      });
      const details = await importBookContent(planned, options, fileFor, write, step);
      if (!details) continue;
      const seriesEntry = seriesId ? getSeriesStore().series.get(seriesId) : undefined;
      if (seriesEntry && details.author && !seriesEntry.author) {
        getSeriesStore().update(seriesEntry.id, { author: details.author });
      }
      getBookStore().update(book.id, {
        title: details.title || plannedBookTitle(series, planned),
        author: details.author,
        ...(details.language ? { language: details.language } : {}),
        kind: series.kind,
        cover: details.cover,
        seriesId,
        volume: planned.volume,
        chapterIds,
        ...(details.parts.length > 0 ? { parts: details.parts } : {}),
      });
    }
  }
  return { bookIds, chapters: chapterCount };
}

/** Writes one chapter note into a book and gives back its id. */
function chapterWriter(
  bookId: string,
  noteKind: NoteKind,
  onWritten: (noteId: string) => void,
): WriteChapter {
  return async (title, content) => {
    const note = await writeNote({
      kind: noteKind,
      bookId,
      compose: (doc) =>
        "html" in content
          ? composeDocumentFromHtml(doc, content.html, title)
          : composeDocument(doc, () => $appendContent({ title, audioClip: content.audio })),
    });
    onWritten(note.id);
    return note.id;
  };
}

/**
 * Adds the chapters found in files to the end of an existing book: an
 * e-book's chapters, a PDF's sections or pages, comic pages, or audio
 * tracks, with any parts they hold. The book keeps its kind: files that
 * don't fit it are skipped and named in `skipped`.
 */
export async function appendToBook(
  bookId: string,
  files: Array<[ImportFile, File]>,
  options: Pick<ImportOptions, "onProgress">,
): Promise<{ chapters: number; skipped: string[] }> {
  const store = getBookStore();
  const target = store.getSnapshot().find((book) => book.id === bookId);
  if (!target) return { chapters: 0, skipped: [] };
  const kind = store.kindOf(target);
  const fits = formatOf(kind);
  const plan = buildImportPlan(files.map(([meta]) => meta));
  const filesByPath = new Map(files.map(([meta, file]) => [meta.path, file]));
  const withFiles: ImportOptions = { ...options, files: filesByPath };
  const fileFor = (path: string) => {
    const file = filesByPath.get(path);
    if (!file) throw new Error(`Missing file: ${path}`);
    return file;
  };
  const nameOf = (book: PlannedBook) =>
    book.container?.name ??
    book.chapters.flatMap((chapter) => chapter.files)[0]?.name ??
    book.title;

  const skipped = plan.skipped.map((path) => path.split("/").pop() ?? path);
  const fitting = plan.series.flatMap((series) =>
    series.books.filter((book) => {
      // A PDF holds text or pages; which one shows only once it is read.
      if (book.format === fits || book.containerKind === "pdf") return true;
      skipped.push(nameOf(book));
      return false;
    }),
  );
  const total = Math.max(1, countSteps(fitting));
  let done = 0;
  const step = (label: string) => {
    done += 1;
    options.onProgress?.(label, done, total);
  };

  const added: string[] = [];
  const parts: Part[] = [];
  const write = chapterWriter(bookId, noteKindFor(kind), (id) => added.push(id));
  let first: BookDetails | null = null;
  for (const book of fitting) {
    const details = await importBookContent(book, withFiles, fileFor, write, step, fits);
    if (!details) {
      skipped.push(nameOf(book));
      continue;
    }
    first ??= details;
    parts.push(...details.parts);
  }

  const current = store.getSnapshot().find((book) => book.id === bookId);
  if (current) {
    const chapterIds = [...current.chapterIds, ...added];
    store.update(bookId, {
      chapterIds,
      ...(parts.length > 0
        ? { parts: validParts({ chapterIds, parts: [...(current.parts ?? []), ...parts] }) }
        : {}),
      ...(!current.cover && first?.cover ? { cover: first.cover } : {}),
      ...(!current.author && first?.author ? { author: first.author } : {}),
    });
  }
  await syncBookFormat(bookId);
  return { chapters: added.length, skipped };
}

function needsSeries(series: PlannedSeries): boolean {
  return series.books.length > 1 || series.books.some((book) => book.volume !== null);
}

interface BookDetails {
  title: string;
  author: string;
  language?: string;
  cover: string | null;
  /** Parts found in the content, opening at chapters just written. */
  parts: Part[];
}

/** A chapter's content: HTML (text, pictures, pages) or a recording. */
type ChapterContent = { html: string } | { audio: { src: string; durationMs: number } };
type WriteChapter = (title: string, content: ChapterContent) => Promise<string>;

/**
 * Parts opening at chapters that were written. A part whose first source
 * wrote nothing opens at the next chapter written after it, or is left out.
 */
function placeParts(
  wanted: Array<{ title: string; source: number }>,
  written: Array<{ source: number; noteId: string }>,
): Part[] {
  const parts: Part[] = [];
  for (const part of wanted) {
    const start = written.find((chapter) => chapter.source >= part.source);
    if (start && !parts.some((other) => other.startsAt === start.noteId)) {
      parts.push({ id: createId(), title: part.title, startsAt: start.noteId });
    }
  }
  return parts;
}

async function importBookContent(
  planned: PlannedBook,
  options: ImportOptions,
  fileFor: (path: string) => File,
  write: WriteChapter,
  step: (label: string) => void,
  /** When set, content of another format is left out and `null` returned. */
  only?: BookFormat,
): Promise<BookDetails | null> {
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
    const written: Array<{ source: number; noteId: string }> = [];
    for (const chapter of epub.chapters) {
      let html = chapter.html;
      for (const path of epub.images.keys()) {
        if (!html.includes(path)) continue;
        const id = await mediaFor(path);
        if (id) html = html.split(`src="${path}"`).join(`src="media:${id}"`);
      }
      const noteId = await write(chapter.title, { html });
      written.push({ source: epub.spine.indexOf(chapter.path), noteId });
    }
    step(epub.title);
    const cover = epub.cover
      ? `media:${await saveMedia(new Blob([epub.cover.bytes as BlobPart], { type: epub.cover.type }))}`
      : null;
    return {
      title: epub.title,
      author: epub.author,
      ...(epub.language ? { language: epub.language } : {}),
      cover,
      parts: placeParts(
        epub.parts
          .map((part) => ({ title: part.title, source: epub.spine.indexOf(part.firstChapterPath) }))
          .filter((part) => part.source >= 0),
        written,
      ),
    };
  }

  if (container && planned.containerKind === "pdf") {
    const content = await readPdf(
      new Uint8Array(await fileFor(container.path).arrayBuffer()),
      (page, pages) =>
        options.onProgress?.(`${planned.title}: page ${page} of ${pages}`, page, pages),
    );
    step(planned.title);
    if (only && only !== (content.kind === "pages" ? "comic" : "prose")) return null;
    if (content.kind === "pages") {
      const ids = await Promise.all(content.pages.map((page) => saveMedia(page)));
      await write(planned.title, { html: pagesHtml(ids) });
      return {
        title: content.title,
        author: content.author,
        cover: ids[0] ? `media:${ids[0]}` : null,
        parts: [],
      };
    }
    for (const chapter of content.chapters) {
      await write(chapter.title, { html: paragraphsHtml(chapter.paragraphs) });
    }
    return { title: content.title, author: content.author, cover: null, parts: [] };
  }

  if (container && planned.containerKind === "archive") {
    const archive = readComicArchive(new Uint8Array(await fileFor(container.path).arrayBuffer()));
    let cover: string | null = null;
    for (const chapter of archive.chapters) {
      const ids: string[] = [];
      for (const page of chapter.pages) {
        ids.push(await saveMedia(new Blob([page.bytes as BlobPart], { type: page.type })));
      }
      cover ??= ids[0] ? `media:${ids[0]}` : null;
      await write(chapter.title, { html: pagesHtml(ids) });
    }
    step(planned.title);
    return { title: "", author: "", cover, parts: [] };
  }

  if (planned.format === "audio") {
    const written: Array<{ source: number; noteId: string }> = [];
    for (const [index, chapter] of planned.chapters.entries()) {
      const file = chapter.files[0];
      if (!file) continue;
      const blob = fileFor(file.path);
      const [id, durationMs] = await Promise.all([saveMedia(blob), audioDuration(blob)]);
      const noteId = await write(chapter.title, { audio: { src: `media:${id}`, durationMs } });
      written.push({ source: index, noteId });
      step(chapter.title);
    }
    return {
      title: "",
      author: "",
      cover: null,
      parts: placeParts(
        planned.parts.map((part) => ({ title: part.title, source: part.firstChapter })),
        written,
      ),
    };
  }

  // Folders of page images.
  let cover: string | null = null;
  for (const chapter of planned.chapters) {
    const ids: string[] = [];
    for (const page of chapter.files) ids.push(await saveMedia(fileFor(page.path)));
    cover ??= ids[0] ? `media:${ids[0]}` : null;
    await write(chapter.title, { html: pagesHtml(ids) });
    step(chapter.title);
  }
  return { title: "", author: "", cover, parts: [] };
}
