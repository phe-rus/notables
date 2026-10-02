import type { BookFormat } from "../../books/store/book-store";
import { naturalCompare, parseName, stripExtension } from "./part-names";
import { isNoise, type SourceKind, sourceKind } from "./source-kinds";

/**
 * Turns a pile of picked files or folders into a plan: series, their books
 * (volumes or seasons), and each book's chapters. Pure, so it can be shown
 * as a preview and adjusted before anything is written.
 */

export interface ImportFile {
  /** Path within the picked folder ("One Piece/Vol 1/001.jpg"), or the file name. */
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface PlannedChapter {
  title: string;
  number: number | null;
  /** Page images in order, or the single audio file. */
  files: ImportFile[];
}

export interface PlannedBook {
  key: string;
  /** The book's own title; empty when it is only a numbered part of its series. */
  title: string;
  volume: number | null;
  format: BookFormat;
  /** An e-book, PDF or comic archive whose chapters are read at import time. */
  container: ImportFile | null;
  containerKind: SourceKind | null;
  chapters: PlannedChapter[];
}

export interface PlannedSeries {
  key: string;
  title: string;
  format: BookFormat;
  /** What a part is called: "Book", "Volume" or "Season". */
  partLabel: string;
  books: PlannedBook[];
}

export interface ImportPlan {
  series: PlannedSeries[];
  skipped: string[];
}

const segments = (path: string) => path.split("/").filter(Boolean);
const dirname = (path: string) => segments(path).slice(0, -1).join("/");

const VOLUME_MARK = /\b(?:vol(?:ume)?|book|tome|part|season|s)\.?\s*0*(\d{1,3})(?=\b|e\d)/i;

/** "The Expanse - Book 2 - Caliban's War" → series "The Expanse", title "Caliban's War". */
function splitOnVolume(raw: string): { series: string; title: string; volume: number | null } {
  const name = stripExtension(raw).replace(/_+/g, " ");
  const match = VOLUME_MARK.exec(name);
  const clean = (text: string) => text.replace(/^[\s\-–—:|.]+|[\s\-–—:|.]+$/g, "").trim();
  if (!match) {
    const parsed = parseName(name);
    return { series: parsed.title, title: parsed.title, volume: null };
  }
  const series = clean(name.slice(0, match.index));
  const rest = clean(name.slice(match.index + match[0].length));
  return { series: series || rest, title: rest, volume: Number(match[1]) };
}

function formatOf(kind: SourceKind): BookFormat {
  if (kind === "image" || kind === "archive") return "comic";
  if (kind === "audio") return "audio";
  return "prose";
}

const byNumberThenName = <T extends { number: number | null; title: string }>(a: T, b: T) =>
  (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) ||
  naturalCompare(a.title, b.title);

export function buildImportPlan(files: ImportFile[]): ImportPlan {
  const skipped: string[] = [];
  const series = new Map<string, PlannedSeries>();
  const seasonal = files.some((file) => /\bs\d{1,3}\s*e\d{1,4}\b/i.test(file.name));

  const seriesFor = (key: string, title: string, format: BookFormat) => {
    let entry = series.get(key);
    if (!entry) {
      entry = {
        key,
        title,
        format,
        partLabel: seasonal ? "Season" : format === "comic" ? "Volume" : "Book",
        books: [],
      };
      series.set(key, entry);
    }
    return entry;
  };
  const bookIn = (
    entry: PlannedSeries,
    key: string,
    title: string,
    volume: number | null,
    format: BookFormat,
  ) => {
    let book = entry.books.find((candidate) => candidate.key === key);
    if (!book) {
      book = { key, title, volume, format, container: null, containerKind: null, chapters: [] };
      entry.books.push(book);
    }
    return book;
  };

  const pages = new Map<string, ImportFile[]>();
  const tracks: ImportFile[] = [];

  for (const file of files) {
    if (isNoise(file.path)) continue;
    const kind = sourceKind(file.name, file.type);
    if (kind === "unsupported") {
      skipped.push(file.path);
      continue;
    }
    if (kind === "image") {
      const folder = dirname(file.path);
      pages.set(folder, [...(pages.get(folder) ?? []), file]);
      continue;
    }
    if (kind === "audio") {
      tracks.push(file);
      continue;
    }
    // E-books, PDFs and comic archives: one file is one book.
    const parts = segments(file.path);
    const named = splitOnVolume(file.name);
    const seriesKey = parts.length > 1 ? (parts[0] as string) : named.series.toLowerCase();
    const seriesTitle = parts.length > 1 ? parseName(parts[0] as string).title : named.series;
    const entry = seriesFor(seriesKey, seriesTitle, formatOf(kind));
    const book = bookIn(entry, file.path, named.title, named.volume, formatOf(kind));
    book.container = file;
    book.containerKind = kind;
  }

  // Page images: each folder of images is a chapter.
  for (const [folder, images] of pages) {
    const parts = segments(folder);
    images.sort((a, b) => naturalCompare(a.name, b.name));
    const top = parts[0] ?? "Imported pages";
    const entry = seriesFor(top, parseName(top).title || top, "comic");
    // Series/Volume/Chapter, Series/Chapter, or loose pages.
    const volumeFolder = parts.length >= 3 ? (parts[1] as string) : null;
    const chapterFolder = parts.length >= 2 ? (parts.at(-1) as string) : top;
    const volume = volumeFolder ? parseName(volumeFolder) : null;
    const book = bookIn(
      entry,
      volumeFolder ? `${top}/${volumeFolder}` : top,
      volume?.title ?? "",
      volume?.volume ?? null,
      "comic",
    );
    const chapter = parseName(chapterFolder);
    book.chapters.push({
      title: chapter.title || `Chapter ${chapter.chapter ?? book.chapters.length + 1}`,
      number: chapter.chapter,
      files: images,
    });
  }

  // Audio: each file is a chapter; folders (or volume numbers in names) are books.
  for (const track of tracks) {
    const parts = segments(track.path);
    const named = splitOnVolume(track.name);
    // "Night Tales Book 1 - 01 Opening": the chapter is what follows the book number.
    const parsed = parseName(named.volume !== null && named.title ? named.title : track.name);
    const top = parts.length > 1 ? (parts[0] as string) : named.series || "Audiobook";
    const entry = seriesFor(top.toLowerCase(), parseName(top).title || top, "audio");
    const bookFolder = parts.length >= 3 ? (parts[1] as string) : null;
    const folderParts = bookFolder ? parseName(bookFolder) : null;
    const volume = folderParts?.volume ?? named.volume;
    const bookKey = bookFolder ? `${top}/${bookFolder}` : `${top}#${volume ?? ""}`;
    const book = bookIn(entry, bookKey, folderParts?.title ?? "", volume, "audio");
    book.chapters.push({
      title: parsed.title || `Chapter ${parsed.chapter ?? book.chapters.length + 1}`,
      number: parsed.chapter,
      files: [track],
    });
  }

  const result = [...series.values()].map((entry) => {
    const books = entry.books
      .map((book) => ({ ...book, chapters: [...book.chapters].sort(byNumberThenName) }))
      .sort(
        (a, b) =>
          (a.volume ?? Number.MAX_SAFE_INTEGER) - (b.volume ?? Number.MAX_SAFE_INTEGER) ||
          naturalCompare(a.title, b.title),
      );
    // Several parts with no numbers read in name order: number them for the reader.
    if (books.length > 1 && books.every((book) => book.volume === null)) {
      books.forEach((book, index) => {
        book.volume = index + 1;
      });
    }
    return { ...entry, books };
  });

  return { series: result.sort((a, b) => naturalCompare(a.title, b.title)), skipped };
}

/** What a planned book is called: its own title, or its series and part number. */
export function plannedBookTitle(series: PlannedSeries, book: PlannedBook): string {
  if (book.title) return book.title;
  return book.volume === null ? series.title : `${series.title} ${series.partLabel} ${book.volume}`;
}
