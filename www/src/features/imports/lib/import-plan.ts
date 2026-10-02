import { kindFromFormat, type MediaKind } from "../../books/model/media-kind";
import type { BookFormat } from "../../books/store/book-store";
import type { KindHint } from "../importers/kind-hints";
import {
  EMPTY_LIBRARY,
  type LibrarySnapshot,
  resolveTarget,
  seriesMatchKey,
} from "./import-targets";
import { naturalCompare, parseName, partFolder, stripExtension } from "./part-names";
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
  /** The "Part 3" folder an audio track sits in. */
  part?: { title: string; order: number };
}

/** A part found before import: its title and the chapter it opens with. */
export interface PlannedPart {
  title: string;
  /**
   * Index into the book's `chapters`; -1 for an e-book, whose chapters are
   * only read at import time and which places its parts then.
   */
  firstChapter: number;
}

/** What reading a file before the preview found out. */
export interface ContentHint {
  kind: KindHint;
  /** Part titles from an e-book's contents. */
  parts: string[];
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
  /** What the file says it is (`ComicInfo.xml`, an EPUB's direction), once read. */
  kindHint: KindHint;
  parts: PlannedPart[];
}

export interface PlannedSeries {
  key: string;
  title: string;
  format: BookFormat;
  /** What it imports as. Page images and archives choose comic or manga; the rest are fixed. */
  kind: MediaKind;
  /** Set once the person picks comic or manga, so later hints don't overrule them. */
  kindChosen: boolean;
  /** The folder it came from, whose name can hint at manga. */
  folder: string | null;
  /** What a part is called: "Book", "Volume" or "Season". */
  partLabel: string;
  books: PlannedBook[];
  /** A live series of the same kind and title it can join. */
  mergeInto: { id: string; title: string } | null;
  /** Whether it joins `mergeInto`; unticked, it imports as a separate series. */
  merge: boolean;
  /** Volume numbers the merge target already has; those are left out when merging. */
  skippedVolumes: number[];
  addedVolumes: number[];
  addedUnnumbered: number;
  /** A franchise a series of the same title sits in, offered when it doesn't merge. */
  franchise: { id: string; title: string } | null;
  joinFranchise: boolean;
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
  const clean = (text: string) =>
    text.replace(/^[\s\-\u2013\u2014:|.]+|[\s\-\u2013\u2014:|.]+$/g, "").trim();
  if (!match) {
    const parsed = parseName(name);
    return { series: parsed.title, title: parsed.title, volume: null };
  }
  const series = clean(name.slice(0, match.index));
  const rest = clean(name.slice(match.index + match[0].length));
  return { series: series || rest, title: rest, volume: Number(match[1]) };
}

/**
 * A track's chapter title and number: "Chapter 947 House Call [rZtZQmN0jIA]"
 * keeps its label and drops the download id; "01 Opening" drops the track
 * number.
 */
function trackTitle(raw: string): { title: string; number: number | null } {
  const parsed = parseName(raw);
  const readable = stripExtension(raw)
    .replace(/_+/g, " ")
    .replace(/[[(][^\])]*[\])]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-\u2013\u2014:|.]+|[\s\-\u2013\u2014:|.]+$/g, "")
    .trim();
  const labelled = /\b(?:chapter|episode)\s*\d/i.test(readable);
  return { title: labelled ? readable : parsed.title, number: parsed.chapter };
}

function formatOf(kind: SourceKind): BookFormat {
  if (kind === "image" || kind === "archive") return "comic";
  if (kind === "audio") return "audio";
  return "prose";
}

const byNumberThenName = <T extends { number: number | null; title: string }>(a: T, b: T) =>
  (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) ||
  naturalCompare(a.title, b.title);

/** Whether a series' kind is picked between comic and manga, rather than fixed. */
export const choosesDrawnKind = (series: PlannedSeries) => series.format === "comic";

/**
 * The guess for page images and archives: each volume's own word
 * (`ComicInfo.xml`, then an EPUB's direction), else "manga" in the folder
 * name; the hint most volumes carry wins, and with none it is manga.
 */
export function guessDrawnKind(books: PlannedBook[], folder: string | null): "comic" | "manga" {
  const folderHint: KindHint = folder && /manga/i.test(folder) ? "manga" : null;
  let manga = 0;
  let comic = 0;
  for (const book of books) {
    const hint = book.kindHint ?? folderHint;
    if (hint === "manga") manga += 1;
    else if (hint === "comic") comic += 1;
  }
  return comic > manga ? "comic" : "manga";
}

function withKind(series: PlannedSeries): PlannedSeries {
  if (!choosesDrawnKind(series)) return { ...series, kind: kindFromFormat(series.format) };
  if (series.kindChosen) return series;
  return { ...series, kind: guessDrawnKind(series.books, series.folder) };
}

const sortBooks = (books: PlannedBook[]) =>
  [...books].sort(
    (a, b) =>
      (a.volume ?? Number.MAX_SAFE_INTEGER) - (b.volume ?? Number.MAX_SAFE_INTEGER) ||
      naturalCompare(a.title, b.title),
  );

/** Planned series with the same kind and title become one. */
function combine(series: PlannedSeries[]): PlannedSeries[] {
  const byKey = new Map<string, PlannedSeries>();
  for (const entry of series) {
    const key = `${entry.kind}|${seriesMatchKey(entry.title)}`;
    const existing = byKey.get(key);
    if (existing)
      byKey.set(key, { ...existing, books: sortBooks([...existing.books, ...entry.books]) });
    else byKey.set(key, entry);
  }
  return [...byKey.values()];
}

/** Settles each series' kind and target again after something changed. */
function settle(plan: ImportPlan, library: LibrarySnapshot): ImportPlan {
  return { ...plan, series: plan.series.map((entry) => resolveTarget(withKind(entry), library)) };
}

/** Adds what the files said about themselves once read, and guesses again. */
export function withContentHints(
  plan: ImportPlan,
  hints: ReadonlyMap<string, ContentHint>,
  library: LibrarySnapshot,
): ImportPlan {
  return settle(
    {
      ...plan,
      series: plan.series.map((entry) => ({
        ...entry,
        books: entry.books.map((book) => {
          const hint = book.container ? hints.get(book.container.path) : undefined;
          if (!hint) return book;
          return {
            ...book,
            kindHint: hint.kind ?? book.kindHint,
            parts:
              hint.parts.length > 0
                ? hint.parts.map((title) => ({ title, firstChapter: -1 }))
                : book.parts,
          };
        }),
      })),
    },
    library,
  );
}

/** The person picks comic or manga for a series. */
export function withSeriesKind(
  plan: ImportPlan,
  seriesKey: string,
  kind: "comic" | "manga",
  library: LibrarySnapshot,
): ImportPlan {
  return settle(
    {
      ...plan,
      series: plan.series.map((entry) =>
        entry.key === seriesKey && choosesDrawnKind(entry)
          ? { ...entry, kind, kindChosen: true }
          : entry,
      ),
    },
    library,
  );
}

/** Renames a planned series, which can change what it merges into. */
export function withSeriesTitle(
  plan: ImportPlan,
  seriesKey: string,
  title: string,
  library: LibrarySnapshot,
): ImportPlan {
  return settle(
    {
      ...plan,
      series: plan.series.map((entry) => (entry.key === seriesKey ? { ...entry, title } : entry)),
    },
    library,
  );
}

export function buildImportPlan(
  files: ImportFile[],
  library: LibrarySnapshot = EMPTY_LIBRARY,
): ImportPlan {
  const skipped: string[] = [];
  const series = new Map<string, PlannedSeries>();
  const seasonal = files.some((file) => /\bs\d{1,3}\s*e\d{1,4}\b/i.test(file.name));

  const seriesFor = (key: string, title: string, format: BookFormat, folder: string | null) => {
    let entry = series.get(key);
    if (!entry) {
      entry = {
        key,
        title,
        format,
        kind: kindFromFormat(format),
        kindChosen: false,
        folder,
        partLabel: seasonal ? "Season" : format === "comic" ? "Volume" : "Book",
        books: [],
        mergeInto: null,
        merge: false,
        skippedVolumes: [],
        addedVolumes: [],
        addedUnnumbered: 0,
        franchise: null,
        joinFranchise: false,
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
      book = {
        key,
        title,
        volume,
        format,
        container: null,
        containerKind: null,
        chapters: [],
        kindHint: null,
        parts: [],
      };
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
    const entry = seriesFor(
      seriesKey,
      seriesTitle,
      formatOf(kind),
      parts.length > 1 ? (parts[0] as string) : null,
    );
    const book = bookIn(entry, file.path, named.title, named.volume, formatOf(kind));
    book.container = file;
    book.containerKind = kind;
  }

  // Page images: each folder of images is a chapter.
  for (const [folder, images] of pages) {
    const parts = segments(folder);
    images.sort((a, b) => naturalCompare(a.name, b.name));
    const top = parts[0] ?? "Imported pages";
    const entry = seriesFor(top, parseName(top).title || top, "comic", parts[0] ?? null);
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

  // Audio: each file is a chapter. Books come from folders ("Narnia/Book 2/..."),
  // a volume in the folder name ("Red Priest - Volume 5/..."), or in file names.
  for (const track of tracks) {
    // "Part 3" folders group chapters inside a book; they are not books themselves.
    const all = segments(track.path);
    const partSegment = all.slice(0, -1).find((segment) => partFolder(segment));
    const part = partSegment ? (partFolder(partSegment) ?? undefined) : undefined;
    const parts = all.filter((segment) => segment !== partSegment);
    const named = splitOnVolume(track.name);
    const top = parts.length > 1 ? (parts[0] as string) : null;
    const topParts = top ? splitOnVolume(top) : null;
    const bookFolder = parts.length >= 3 ? splitOnVolume(parts[1] as string) : null;
    const seriesTitle = topParts
      ? topParts.volume !== null
        ? topParts.series
        : parseName(top as string).title || (top as string)
      : // Loose files without a volume are one book, whatever their names say.
        named.volume !== null
        ? named.series
        : "Audiobook";
    const volume = bookFolder?.volume ?? topParts?.volume ?? named.volume;
    const seriesKey = seriesTitle.toLowerCase();
    const entry = seriesFor(seriesKey, seriesTitle, "audio", top);
    if (/\bvol/i.test(parts.slice(0, -1).join("/") || track.name)) entry.partLabel = "Volume";
    const bookKey = bookFolder ? `${seriesKey}/${parts[1]}` : `${seriesKey}#${volume ?? ""}`;
    const bookTitle = bookFolder
      ? bookFolder.volume !== null
        ? bookFolder.title
        : bookFolder.series
      : topParts?.volume !== null
        ? (topParts?.title ?? "")
        : "";
    const book = bookIn(entry, bookKey, bookTitle, volume, "audio");
    const { title, number } = trackTitle(
      named.volume !== null && named.title ? named.title : track.name,
    );
    book.chapters.push({
      title: title || `Chapter ${number ?? book.chapters.length + 1}`,
      number,
      files: [track],
      ...(part ? { part } : {}),
    });
  }

  const result = [...series.values()].map((entry) => {
    const books = sortBooks(entry.books.map(withParts));
    // Several parts with no numbers read in name order: number them for the reader.
    if (books.length > 1 && books.every((book) => book.volume === null)) {
      books.forEach((book, index) => {
        book.volume = index + 1;
      });
    }
    return withKind({ ...entry, books });
  });

  const plan = {
    series: combine(result).sort((a, b) => naturalCompare(a.title, b.title)),
    skipped,
  };
  return settle(plan, library);
}

/** Chapters in order, parts first; each part opens at its first chapter. */
function withParts(book: PlannedBook): PlannedBook {
  const chapters = [...book.chapters].sort(
    (a, b) => (a.part?.order ?? 0) - (b.part?.order ?? 0) || byNumberThenName(a, b),
  );
  const parts: PlannedPart[] = [];
  chapters.forEach((chapter, index) => {
    if (chapter.part && chapter.part.title !== chapters[index - 1]?.part?.title) {
      parts.push({ title: chapter.part.title, firstChapter: index });
    }
  });
  return { ...book, chapters, parts };
}

/** What a planned book is called: its own title, or its series and part number. */
export function plannedBookTitle(series: PlannedSeries, book: PlannedBook): string {
  if (book.title) return book.title;
  return book.volume === null ? series.title : `${series.title} ${series.partLabel} ${book.volume}`;
}
