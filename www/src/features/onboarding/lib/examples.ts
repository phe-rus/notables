import type { InvoiceDocument } from "@notables/core";
import { toast } from "@phe-rus/hino";
import { useMemo } from "react";
import { t } from "../../../i18n/i18n";
import { type BookEntry, getBookStore, useBooks } from "../../books/store/book-store";
import { getInvoiceStore, useInvoices } from "../../invoices/store/invoice-store";
import { getLibrary, type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { deleteNote } from "../../notes/actions/delete-note";
import { moveAllToBin } from "../../trash/lib/recycle-bin";
import { RETENTION_DAYS } from "../../trash/lib/retention";
import { welcomeBook, welcomeNotes } from "../content/welcome-library";
import { smallHours, welcomeArticle, welcomeInvoice } from "../content/welcome-shelf";

/** The ids of everything the welcome wrote on this device. */
export interface Examples {
  notes: string[];
  books: string[];
  invoices: string[];
}

const EXAMPLES = "notables:examples";

function recorded(): Examples | null {
  try {
    const saved = localStorage.getItem(EXAMPLES);
    return saved ? (JSON.parse(saved) as Examples) : null;
  } catch {
    return null;
  }
}

export function recordExamples(more: Examples) {
  const known = recorded() ?? { notes: [], books: [], invoices: [] };
  const merged: Examples = {
    notes: [...known.notes, ...more.notes],
    books: [...known.books, ...more.books],
    invoices: [...known.invoices, ...more.invoices],
  };
  try {
    localStorage.setItem(EXAMPLES, JSON.stringify(merged));
  } catch {
    // The titles below still find them.
  }
}

const headingOf = (markdown: string) => markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
const noteTitles = new Set([
  ...welcomeNotes.map((note) => headingOf(note.markdown)),
  headingOf(welcomeArticle),
]);
const bookTitles = new Set([welcomeBook.title, smallHours.title, "Tidewalker", "Pip & the Lamp"]);

/**
 * Devices welcomed before the ids were kept: the examples are known by
 * their titles, and invoices by their sample issuer and client.
 */
function byTitle(notes: LibraryEntry[], books: BookEntry[], invoices: InvoiceDocument[]) {
  return {
    notes: notes.filter((entry) => !entry.bookId && noteTitles.has(entry.title)),
    books: books.filter((book) => book.author === "Notables" && bookTitles.has(book.title)),
    invoices: invoices.filter(
      (invoice) =>
        invoice.issuer.name === welcomeInvoice.issuer.name &&
        invoice.client.name === welcomeInvoice.client.name,
    ),
  };
}

/** The examples still in the library, not those already in Recently Deleted. */
function findExamples(notes: LibraryEntry[], books: BookEntry[], invoices: InvoiceDocument[]) {
  const live = notes.filter((entry) => !entry.trashedAt);
  const ids = recorded();
  if (!ids) return byTitle(live, books, invoices);
  const has = (list: string[]) => {
    const set = new Set(list);
    return (item: { id: string }) => set.has(item.id);
  };
  return {
    notes: live.filter(has(ids.notes)),
    books: books.filter(has(ids.books)),
    invoices: invoices.filter(has(ids.invoices)),
  };
}

/** How many examples are still in the library, kept current. */
export function useExampleCount(): number {
  const notes = useLibrary();
  const books = useBooks();
  const invoices = useInvoices();
  return useMemo(() => {
    const found = findExamples(notes, books, invoices);
    return found.notes.length + found.books.length + found.invoices.length;
  }, [notes, books, invoices]);
}

/**
 * Start fresh: the guide and every example go to Recently Deleted (the
 * invoices, which have no bin, come back with Undo). Anything the person
 * wrote themselves stays where it is.
 */
export function removeExamples() {
  const found = findExamples(
    getLibrary().getSnapshot(),
    getBookStore().getSnapshot(),
    getInvoiceStore().getSnapshot(),
  );
  const undoBin = moveAllToBin(found.notes, found.books);
  const invoices = getInvoiceStore();
  for (const invoice of found.invoices) invoices.remove(invoice.id);
  toast(t("examples.removed"), {
    description: t("trash.restoreWithin", { days: RETENTION_DAYS }),
    action: {
      label: t("common.undo"),
      onClick: () => {
        undoBin();
        for (const invoice of found.invoices) invoices.invoices.set(invoice.id, invoice);
      },
    },
  });
}

/** Written by the welcome and never changed since (opening a note doesn't count). */
const untouched = (item: { createdAt: number; updatedAt: number }) =>
  item.updatedAt - item.createdAt < 60_000;

/**
 * Before this device joins another device's space: its own examples, as the
 * welcome wrote them, are erased, so the space keeps one set instead of two.
 * Anything edited stays and joins like the person's own notes.
 */
export async function eraseUntouchedExamples(): Promise<void> {
  const library = getLibrary();
  const books = getBookStore();
  const found = findExamples(
    library.getSnapshot(),
    books.getSnapshot(),
    getInvoiceStore().getSnapshot(),
  );
  const notes = new Map(library.getSnapshot().map((entry) => [entry.id, entry]));
  for (const book of found.books) {
    const chapters = book.chapterIds.map((id) => notes.get(id));
    if (!untouched(book) || !chapters.every((chapter) => !chapter || untouched(chapter))) continue;
    for (const id of book.chapterIds) await deleteNote(id);
    books.remove(book.id);
  }
  for (const note of found.notes) if (untouched(note)) await deleteNote(note.id);
  const invoices = getInvoiceStore();
  for (const invoice of found.invoices) invoices.remove(invoice.id);
  try {
    localStorage.removeItem(EXAMPLES);
  } catch {
    // Nothing recorded to forget.
  }
}
