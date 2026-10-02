import { fileNameFor, saveFile } from "../../../platform/save-file";
import { loadMedia } from "../../../platform/storage/media-store";
import { kindOfBook } from "../lib/book-kind";
import type { MediaKind } from "../model/media-kind";
import type { BookEntry } from "../store/book-store";
import { type BookMaterial, loadBookMaterial } from "./book-material";
import { buildEpub } from "./build-epub";
import { buildAudiobook, buildComicArchive } from "./formats/build-archives";
import { buildDocx } from "./formats/build-docx";
import { buildHtml } from "./formats/build-html";
import { buildPdf } from "./formats/build-pdf";
import { buildMarkdown, buildText } from "./formats/build-text";

export type ExportFormat =
  | "epub"
  | "pdf"
  | "docx"
  | "html"
  | "markdown"
  | "text"
  | "cbz"
  | "images"
  | "audiobook";

interface ExportedFile {
  bytes: Uint8Array;
  extension: string;
  type: string;
}

interface FormatSpec {
  label: string;
  /** Where it opens, in plain words. */
  hint: string;
  build: (material: BookMaterial) => Promise<ExportedFile>;
}

const encoder = new TextEncoder();

export const exportFormats: Record<ExportFormat, FormatSpec> = {
  epub: {
    label: "EPUB",
    hint: "Apple Books, Kobo, Google Play Books",
    build: async (material) => ({
      bytes: await buildEpub({
        book: material.book,
        chapters: material.chapters,
        loadMedia,
        language: document.documentElement.lang || "en",
      }),
      extension: "epub",
      type: "application/epub+zip",
    }),
  },
  pdf: {
    label: "PDF",
    hint: "Print, or read anywhere",
    build: async (material) => ({
      bytes: await buildPdf(material),
      extension: "pdf",
      type: "application/pdf",
    }),
  },
  docx: {
    label: "Word",
    hint: "Microsoft Word, Pages, Google Docs",
    build: async (material) => ({
      bytes: await buildDocx(material),
      extension: "docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  },
  html: {
    label: "Web page",
    hint: "One file that opens in any browser",
    build: async (material) => ({
      bytes: encoder.encode(await buildHtml(material)),
      extension: "html",
      type: "text/html",
    }),
  },
  markdown: {
    label: "Markdown",
    hint: "Obsidian, iA Writer, GitHub",
    build: async (material) => {
      const { bytes, zipped } = await buildMarkdown(material);
      return zipped
        ? { bytes, extension: "zip", type: "application/zip" }
        : { bytes, extension: "md", type: "text/markdown" };
    },
  },
  text: {
    label: "Plain text",
    hint: "Just the words",
    build: async (material) => ({
      bytes: buildText(material),
      extension: "txt",
      type: "text/plain",
    }),
  },
  cbz: {
    label: "Comic archive (CBZ)",
    hint: "Comic and manga readers",
    build: async (material) => ({
      bytes: await buildComicArchive(material, true),
      extension: "cbz",
      type: "application/vnd.comicbook+zip",
    }),
  },
  images: {
    label: "Pictures (ZIP)",
    hint: "Every page as an image",
    build: async (material) => ({
      bytes: await buildComicArchive(material, false),
      extension: "zip",
      type: "application/zip",
    }),
  },
  audiobook: {
    label: "Audiobook (ZIP)",
    hint: "Tracks, a playlist and the transcript",
    build: async (material) => ({
      bytes: await buildAudiobook(material),
      extension: "zip",
      type: "application/zip",
    }),
  },
};

const kindFormats: Record<MediaKind, ExportFormat[]> = {
  book: ["epub", "pdf", "docx", "html", "markdown", "text"],
  comic: ["cbz", "pdf", "epub", "images", "html"],
  manga: ["cbz", "pdf", "epub", "images", "html"],
  audiobook: ["audiobook", "epub", "html", "text"],
};

/** The formats that suit a book, most useful first. */
export const formatsFor = (book: BookEntry): ExportFormat[] => kindFormats[kindOfBook(book)];

/** Builds the book in a format and saves it the way the device expects. */
export async function exportBook(
  book: BookEntry,
  format: ExportFormat,
): Promise<"saved" | "cancelled"> {
  const material = await loadBookMaterial(book);
  const file = await exportFormats[format].build(material);
  return saveFile(file.bytes, fileNameFor(material.title, file.extension), file.type);
}

/** Kept for callers that only offer EPUB. */
export async function exportBookAsEpub(book: BookEntry): Promise<void> {
  await exportBook(book, "epub");
}
