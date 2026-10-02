import { createId, type NoteKind } from "@notables/core";
import { composeDocumentFromHtml, composeDocumentFromMarkdown } from "@notables/editor";
import { saveMedia } from "../../../platform/storage/media-store";
import { type BookEntry, getBookStore } from "../../books/store/book-store";
import { getInvoiceStore } from "../../invoices/store/invoice-store";
import { writeNote } from "../../library/lib/write-note";
import { comicPages, coverArt, mangaPages } from "../content/welcome-art";
import { smallHours, welcomeArticle, welcomeInvoice } from "../content/welcome-shelf";

const HOUR = 3_600_000;

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

function sampleInvoices() {
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
}

/**
 * Examples for the rest of the library: an article, a book of short
 * pieces, a manga read right to left, a colour comic, and an invoice with
 * its receipt. Everything can be edited or deleted like anything else.
 */
export async function seedWelcomeShelf() {
  await writeNote({
    kind: "article",
    updatedAt: Date.now() - 6 * HOUR,
    compose: (doc) => composeDocumentFromMarkdown(doc, welcomeArticle),
  });

  await bookOf(
    { title: smallHours.title, subtitle: smallHours.subtitle, author: smallHours.author },
    smallHours.chapters.map((markdown) => ({
      kind: "story" as const,
      compose: (doc) => composeDocumentFromMarkdown(doc, markdown),
    })),
  );

  await bookOf(
    {
      title: "Tidewalker",
      subtitle: "Volume 1",
      author: "Notables",
      format: "comic",
      direction: "rtl",
      cover: await saveSvg(coverArt("Tidewalker", "Volume 1", "ink")),
    },
    await drawnChapters("manga", [
      { title: "The Lamp", pages: mangaPages(1) },
      { title: "The Stairs", pages: mangaPages(2) },
    ]),
  );

  await bookOf(
    {
      title: "Pip & the Lamp",
      subtitle: "A short comic",
      author: "Notables",
      format: "comic",
      direction: "ltr",
      cover: await saveSvg(coverArt("Pip & the Lamp", "A short comic", "colour")),
    },
    await drawnChapters("comic", [{ title: "A New Spark", pages: comicPages() }]),
  );

  sampleInvoices();
}
