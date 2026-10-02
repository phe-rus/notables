import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  PDFName,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { directionOf } from "../../model/media-kind";
import { type BookMaterial, isDrawnBook, materialPages } from "../book-material";
import type { Block, Inline } from "../document-blocks";
import { inkToPng } from "../ink-image";
import { MediaFiles, toPng } from "../media-files";

/** A trade paperback page, 6 × 9 inches. */
const PAGE = { width: 432, height: 648 };
const MARGIN = { top: 62, bottom: 66, inner: 58, outer: 50 };
const BODY = 11;
const LEADING = 1.48;
const INK = rgb(0.11, 0.1, 0.09);
const MUTED = rgb(0.45, 0.42, 0.4);
const ACCENT = rgb(0.54, 0.35, 0);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  sans: PDFFont;
  mono: PDFFont;
}

/**
 * The standard PDF fonts only cover Western European letters; anything
 * else is swapped for the nearest plain character, or dropped.
 */
function printable(font: PDFFont, text: string): string {
  const swaps: Record<string, string> = {
    "‐": "-",
    "‑": "-",
    "‒": "-",
    "−": "-",
    " ": " ",
    " ": " ",
    " ": " ",
  };
  let out = "";
  for (const char of text) {
    const candidate = swaps[char] ?? char;
    try {
      font.encodeText(candidate);
      out += candidate;
    } catch {
      out += char.normalize("NFKD").replace(/[^\x20-\x7e]/g, "");
    }
  }
  return out;
}

interface Word {
  text: string;
  font: PDFFont;
  size: number;
  /** A space follows it on the line. */
  space: boolean;
  underline?: boolean;
}

function fontFor(fonts: Fonts, inline: Inline): PDFFont {
  if (inline.code) return fonts.mono;
  if (inline.bold && inline.italic) return fonts.boldItalic;
  if (inline.bold) return fonts.bold;
  if (inline.italic) return fonts.italic;
  return fonts.regular;
}

/** Splits styled text into words that can be wrapped across lines. */
function wordsOf(inlines: Inline[], fonts: Fonts, size: number, base?: PDFFont): Word[][] {
  const lines: Word[][] = [[]];
  for (const inline of inlines) {
    const font =
      base && !inline.bold && !inline.italic && !inline.code ? base : fontFor(fonts, inline);
    const parts = inline.text.split("\n");
    parts.forEach((part, partIndex) => {
      if (partIndex > 0) lines.push([]);
      const current = lines[lines.length - 1] as Word[];
      for (const piece of part.split(/(\s+)/)) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) {
          const last = current.at(-1);
          if (last) last.space = true;
          continue;
        }
        current.push({
          text: printable(font, piece),
          font,
          size,
          space: false,
          underline: inline.underline || Boolean(inline.href),
        });
      }
    });
  }
  return lines;
}

class Typesetter {
  page!: PDFPage;
  y = 0;
  pageNumber = 0;
  readonly pages: PDFPage[] = [];

  constructor(
    readonly pdf: PDFDocument,
    readonly fonts: Fonts,
    readonly runningTitle: string,
  ) {}

  get left() {
    // Wider inner margin on the binding side.
    return this.pageNumber % 2 === 1 ? MARGIN.inner : MARGIN.outer;
  }

  get width() {
    return PAGE.width - MARGIN.inner - MARGIN.outer;
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE.width, PAGE.height]);
    this.pages.push(this.page);
    this.pageNumber += 1;
    this.y = PAGE.height - MARGIN.top;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN.bottom) this.newPage();
  }

  /** Lays out wrapped lines of words. */
  paragraph(
    lines: Word[][],
    options: {
      size: number;
      indent?: number;
      color?: ReturnType<typeof rgb>;
      align?: "left" | "center";
      after?: number;
      firstIndent?: number;
    },
  ) {
    const lineHeight = options.size * LEADING;
    const indent = options.indent ?? 0;
    for (const words of lines) {
      let line: Word[] = [];
      let lineWidth = 0;
      let first = true;
      const flush = () => {
        this.ensure(lineHeight);
        const extraIndent = first ? (options.firstIndent ?? 0) : 0;
        let x = this.left + indent + extraIndent;
        if (options.align === "center") x = this.left + (this.width - lineWidth) / 2;
        const baseline = this.y - options.size;
        line.forEach((word, index) => {
          this.page.drawText(word.text, {
            x,
            y: baseline,
            size: word.size,
            font: word.font,
            color: options.color ?? INK,
          });
          const w = word.font.widthOfTextAtSize(word.text, word.size);
          if (word.underline) {
            this.page.drawLine({
              start: { x, y: baseline - 1.5 },
              end: { x: x + w, y: baseline - 1.5 },
              thickness: 0.5,
              color: options.color ?? INK,
            });
          }
          x +=
            w +
            (word.space && index < line.length - 1
              ? word.font.widthOfTextAtSize(" ", word.size)
              : 0);
        });
        this.y -= lineHeight;
        line = [];
        lineWidth = 0;
        first = false;
      };
      for (const word of words) {
        const w = word.font.widthOfTextAtSize(word.text, word.size);
        const space =
          line.length > 0 ? (line.at(-1)?.font.widthOfTextAtSize(" ", word.size) ?? 0) : 0;
        const available = this.width - indent - (first ? (options.firstIndent ?? 0) : 0);
        if (line.length > 0 && lineWidth + space + w > available) flush();
        if (line.length > 0) lineWidth += space;
        line.push(word);
        lineWidth += w;
      }
      if (line.length > 0 || words.length === 0) flush();
    }
    this.y -= options.after ?? 0;
  }

  image(image: PDFImage, caption: string) {
    const maxW = this.width;
    const maxH = PAGE.height - MARGIN.top - MARGIN.bottom - 30;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1.2);
    const w = image.width * scale;
    const h = image.height * scale;
    this.ensure(h + (caption ? 24 : 10));
    this.page.drawImage(image, {
      x: this.left + (maxW - w) / 2,
      y: this.y - h,
      width: w,
      height: h,
    });
    this.y -= h + 8;
    if (caption) {
      this.paragraph(wordsOf([{ text: caption }], this.fonts, 9, this.fonts.italic), {
        size: 9,
        color: MUTED,
        align: "center",
        after: 6,
      });
    }
    this.y -= 6;
  }

  footers(skip: number) {
    this.pages.forEach((page, index) => {
      if (index < skip) return;
      const number = String(index + 1);
      const size = 8.5;
      const w = this.fonts.sans.widthOfTextAtSize(number, size);
      page.drawText(number, {
        x: (PAGE.width - w) / 2,
        y: MARGIN.bottom / 2,
        size,
        font: this.fonts.sans,
        color: MUTED,
      });
      const title = printable(this.fonts.sans, this.runningTitle.toUpperCase());
      const tw = this.fonts.sans.widthOfTextAtSize(title, 7);
      page.drawText(title, {
        x: (PAGE.width - tw) / 2,
        y: PAGE.height - MARGIN.top / 2,
        size: 7,
        font: this.fonts.sans,
        color: MUTED,
      });
    });
  }
}

async function embedPicture(
  pdf: PDFDocument,
  media: MediaFiles,
  src: string,
): Promise<PDFImage | null> {
  const file = await media.add(src);
  if (!file?.type.startsWith("image/")) return null;
  const png = await toPng(file);
  if (!png) return null;
  return file.type === "image/jpeg" ? pdf.embedJpg(png.bytes) : pdf.embedPng(png.bytes);
}

async function writeBlocks(set: Typesetter, blocks: Block[], media: MediaFiles) {
  const { fonts } = set;
  let previous: Block["type"] | null = null;
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const size = block.level === 1 ? 16 : block.level === 2 ? 13.5 : 12;
        set.y -= 8;
        set.ensure(size * 3);
        set.paragraph(wordsOf(block.inlines, fonts, size, fonts.bold), { size, after: 6 });
        break;
      }
      case "paragraph": {
        if (!block.inlines.some((inline) => inline.text.trim())) {
          set.y -= BODY * 0.6;
          break;
        }
        // Book style: indent paragraphs that follow paragraphs.
        set.paragraph(wordsOf(block.inlines, fonts, BODY), {
          size: BODY,
          firstIndent: previous === "paragraph" ? 16 : 0,
          after: 3,
        });
        break;
      }
      case "quote": {
        const top = set.y;
        set.paragraph(wordsOf(block.inlines, fonts, BODY, fonts.italic), {
          size: BODY,
          indent: 16,
          color: rgb(0.3, 0.28, 0.26),
          after: 8,
        });
        if (set.y < top) {
          set.page.drawLine({
            start: { x: set.left + 4, y: Math.min(top, PAGE.height - MARGIN.top) },
            end: { x: set.left + 4, y: set.y + 8 },
            thickness: 1.6,
            color: ACCENT,
          });
        }
        break;
      }
      case "list":
        block.items.forEach((item, index) => {
          const marker =
            block.style === "number"
              ? `${index + 1}.`
              : block.style === "check"
                ? item.checked
                  ? "[x]"
                  : "[ ]"
                : "•";
          const indent = 14 + item.depth * 14;
          const startY = set.y;
          set.ensure(BODY * LEADING);
          set.paragraph(wordsOf(item.inlines, fonts, BODY), { size: BODY, indent, after: 2 });
          const page = set.page;
          const y = Math.min(startY, PAGE.height - MARGIN.top) - BODY;
          page.drawText(printable(fonts.regular, marker), {
            x: set.left + indent - 13,
            y,
            size: BODY,
            font: fonts.regular,
            color: INK,
          });
        });
        set.y -= 6;
        break;
      case "code":
        set.paragraph(
          block.text
            .split("\n")
            .map((line) => [
              { text: printable(fonts.mono, line), font: fonts.mono, size: 9, space: false },
            ]),
          { size: 9, indent: 10, after: 8 },
        );
        break;
      case "rule": {
        set.ensure(24);
        const text = "*   *   *";
        const w = fonts.regular.widthOfTextAtSize(text, BODY);
        set.page.drawText(text, {
          x: set.left + (set.width - w) / 2,
          y: set.y - 16,
          size: BODY,
          font: fonts.regular,
          color: MUTED,
        });
        set.y -= 28;
        break;
      }
      case "image": {
        const image = await embedPicture(set.pdf, media, block.src);
        if (image) set.image(image, block.caption);
        break;
      }
      case "ink": {
        const png = await inkToPng(block.strokes, block.height);
        if (png) set.image(await set.pdf.embedPng(png.bytes), "");
        break;
      }
      case "audio":
        if (block.transcript) {
          set.paragraph(wordsOf([{ text: block.transcript }], fonts, BODY, fonts.italic), {
            size: BODY,
            color: rgb(0.3, 0.28, 0.26),
            after: 6,
          });
        }
        break;
    }
    previous = block.type;
  }
}

async function standardFonts(pdf: PDFDocument): Promise<Fonts> {
  const [regular, bold, italic, boldItalic, sans, mono] = await Promise.all([
    pdf.embedFont(StandardFonts.TimesRoman),
    pdf.embedFont(StandardFonts.TimesRomanBold),
    pdf.embedFont(StandardFonts.TimesRomanItalic),
    pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.Courier),
  ]);
  return { regular, bold, italic, boldItalic, sans, mono };
}

function setInfo(pdf: PDFDocument, material: BookMaterial) {
  pdf.setTitle(material.title);
  if (material.author) pdf.setAuthor(material.author);
  pdf.setCreator("Notables");
  pdf.setProducer("Notables");
}

/** A typeset book: title page, contents, chapters and page numbers. */
async function buildProsePdf(material: BookMaterial): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  setInfo(pdf, material);
  const fonts = await standardFonts(pdf);
  const set = new Typesetter(pdf, fonts, material.title);
  const media = new MediaFiles();

  // Title page.
  set.newPage();
  set.y = PAGE.height * 0.62;
  set.paragraph(wordsOf([{ text: material.title }], fonts, 26, fonts.bold), {
    size: 26,
    align: "center",
    after: 10,
  });
  if (material.book.subtitle) {
    set.paragraph(wordsOf([{ text: material.book.subtitle }], fonts, 13, fonts.italic), {
      size: 13,
      align: "center",
      color: MUTED,
    });
  }
  if (material.author) {
    set.y = PAGE.height * 0.25;
    set.paragraph(wordsOf([{ text: material.author.toUpperCase() }], fonts, 10, fonts.sans), {
      size: 10,
      align: "center",
      color: MUTED,
    });
  }
  const frontMatter = 1;

  for (const [index, chapter] of material.chapters.entries()) {
    if (chapter.part) {
      // A part has a page of its own, its title a little above the middle.
      set.newPage();
      set.y = PAGE.height * 0.58;
      set.paragraph(wordsOf([{ text: chapter.part.title }], fonts, 24, fonts.regular), {
        size: 24,
        align: "center",
      });
    }
    set.newPage();
    // Chapters start a third of the way down, like a printed book.
    set.y = PAGE.height - MARGIN.top - 70;
    set.paragraph(wordsOf([{ text: `CHAPTER ${index + 1}` }], fonts, 8.5, fonts.sans), {
      size: 8.5,
      color: ACCENT,
      align: "center",
      after: 4,
    });
    set.paragraph(wordsOf([{ text: chapter.title }], fonts, 20, fonts.regular), {
      size: 20,
      align: "center",
      after: 22,
    });
    if (!chapter.document) {
      set.paragraph(
        wordsOf(
          [{ text: "This chapter wasn’t available on this device." }],
          fonts,
          BODY,
          fonts.italic,
        ),
        {
          size: BODY,
          color: MUTED,
        },
      );
      continue;
    }
    await writeBlocks(set, chapter.blocks, media);
  }
  set.footers(frontMatter);
  return pdf.save();
}

/** One drawn page per PDF page, sized to the artwork. */
async function buildComicPdf(material: BookMaterial): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  setInfo(pdf, material);
  const media = new MediaFiles();
  for (const src of materialPages(material)) {
    const image = await embedPicture(pdf, media, src);
    if (!image) continue;
    // 72 points per inch at about 160 pixels per inch.
    const scale = 72 / 160;
    const page = pdf.addPage([image.width * scale, image.height * scale]);
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  if (pdf.getPageCount() === 0) throw new Error("This book has no pages to export yet.");
  if (directionOf(material.kind) === "rtl") {
    // Manga reads right to left; tell PDF readers to turn pages that way.
    pdf.catalog.set(PDFName.of("ViewerPreferences"), pdf.context.obj({ Direction: "R2L" }));
  }
  return pdf.save();
}

export function buildPdf(material: BookMaterial): Promise<Uint8Array> {
  return isDrawnBook(material.book) ? buildComicPdf(material) : buildProsePdf(material);
}
