import lettering from "@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2?url";
import { createId, type NoteKind } from "@notables/core";
import { composeDocumentFromHtml, composeDocumentFromMarkdown } from "@notables/pluraliti";
import { type BookEntry, getBookStore } from "@/features/books/store/book-store";
import { getInvoiceStore } from "@/features/invoices/store/invoice-store";
import { writeNote } from "@/features/library/lib/write-note";
import { saveMedia } from "@/platform/storage/media-store";
import { coverArt, mangaPages } from "../content/welcome-art";
import { pipComicCover, pipComicPage } from "../content/welcome-comic";
import { smallHours, welcomeArticle, welcomeInvoice } from "../content/welcome-shelf";
import type { Examples } from "./examples";

const HOUR = 3_600_000;

/** The comic's lettering, as a data URL its pages can carry. */
async function letteringFont(): Promise<string | undefined> {
  try {
    const blob = await (await fetch(lettering)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Pages fall back to the system's hand-lettered fonts.
    return undefined;
  }
}

const saveSvg = async (svg: string) =>
  `media:${await saveMedia(new Blob([svg], { type: "image/svg+xml" }))}`;

/** A book whose chapters are written for it, so they live inside it. */
async function bookOf(
  details: Partial<BookEntry>,
  chapters: Array<{ kind: NoteKind; compose: Parameters<typeof writeNote>[0]["compose"] }>,
) {
  const books = getBookStore();
  const book = books.create();
  const chapterIds: string[] = [];
  for (const chapter of chapters) {
    const note = await writeNote({ ...chapter, bookId: book.id });
    chapterIds.push(note.id);
  }
  books.update(book.id, { ...details, chapterIds });
  return book.id;
}

async function drawnChapters(kind: NoteKind, chapters: Array<{ title: string; pages: string[] }>) {
  const result = [];
  for (const chapter of chapters) {
    const sources = await Promise.all(chapter.pages.map(saveSvg));
    const html = sources.map((src) => `<img src="${src}" alt="">`).join("");
    result.push({
      kind,
      compose: (doc: Parameters<typeof composeDocumentFromHtml>[0]) =>
        composeDocumentFromHtml(doc, html, chapter.title),
    });
  }
  return result;
}

function sampleInvoices(): string[] {
  const store = getInvoiceStore();
  const items = () => welcomeInvoice.items.map((item) => ({ ...item, id: createId() }));
  // Written straight to the store, so the sample issuer never becomes the
  // person's own default details.
  const invoice = store.create("invoice");
  store.invoices.set(invoice.id, { ...invoice, ...welcomeInvoice, items: items() });
  const receipt = store.create("receipt");
  store.invoices.set(receipt.id, {
    ...receipt,
    ...welcomeInvoice,
    items: items(),
    notes: `Payment for ${invoice.number}. Thank you! This is an example receipt.`,
  });
  return [invoice.id, receipt.id];
}

/**
 * Examples for the rest of the library: an article, a book of short
 * pieces, a manga read right to left, a colour comic, and an invoice with
 * its receipt. Everything can be edited or deleted like anything else.
 */
export async function seedWelcomeShelf(): Promise<Examples> {
  const article = await writeNote({
    kind: "article",
    updatedAt: Date.now() - 6 * HOUR,
    compose: (doc) => composeDocumentFromMarkdown(doc, welcomeArticle),
  });

  const smallHoursId = await bookOf(
    { title: smallHours.title, subtitle: smallHours.subtitle, author: smallHours.author },
    smallHours.chapters.map((markdown) => ({
      kind: "story" as const,
      compose: (doc) => composeDocumentFromMarkdown(doc, markdown),
    })),
  );

  const tidewalker = await bookOf(
    {
      title: "Tidewalker",
      subtitle: "Volume 1",
      author: "Notables",
      kind: "manga",
      cover: await saveSvg(coverArt("Tidewalker", "Volume 1")),
    },
    await drawnChapters("manga", [
      { title: "The Lamp", pages: mangaPages(1) },
      { title: "The Stairs", pages: mangaPages(2) },
    ]),
  );

  const font = await letteringFont();
  const pip = await bookOf(
    {
      title: "Pip & the Lamp",
      subtitle: "A short comic",
      author: "Notables",
      kind: "comic",
      cover: await saveSvg(pipComicCover(font)),
    },
    await drawnChapters("comic", [{ title: "A New Spark", pages: [pipComicPage(font)] }]),
  );

  return {
    notes: [article.id],
    books: [smallHoursId, tidewalker, pip],
    invoices: sampleInvoices(),
  };
}
