import { createId } from "@notables/core";
import { toast } from "@ultrapeach/ui";
import { locale, t } from "../../../i18n/i18n";
import { eraseBook, ownChapters } from "../../books/actions/erase-book";
import { syncBookFormat } from "../../books/actions/sync-book-format";
import { type BookEntry, getBookStore } from "../../books/store/book-store";
import { getSeriesStore, type SeriesEntry } from "../../books/store/series-store";
import { getLibrary, type LibraryEntry } from "../../library/store/library-store";
import { deleteNote } from "../../notes/actions/delete-note";

import { binNotes, binSeriesAndBooks } from "./bin-groups";
import { isExpired, RETENTION_DAYS } from "./retention";

/*
 * Recently Deleted: notes, books and whole series wait here, restorable,
 * for a week before they're erased for good.
 */

function setNotesTrashed(ids: string[], trashedAt: number | null) {
  const library = getLibrary();
  for (const id of ids) library.update(id, { trashedAt });
}

/** Moves books to the bin or back; `batch` ties them to a series deleted with them. */
function setBooksTrashed(
  books: BookEntry[],
  trashedAt: number | null,
  batch: string | null = null,
) {
  const store = getBookStore();
  for (const book of books) {
    store.update(book.id, { trashedAt, trashBatch: trashedAt ? batch : null });
    // A book's own chapters go and come back with it.
    setNotesTrashed(ownChapters(book), trashedAt);
  }
}

/** "1 series and 2 books", in the reader's language. */
function countLabel(series: number, books: number): string {
  const parts = [
    series > 0 ? t("trash.seriesCount", { count: series }) : null,
    books > 0 ? t("trash.bookCount", { count: books }) : null,
  ].filter((part): part is string => part !== null);
  return new Intl.ListFormat(locale(), { type: "conjunction" }).format(parts);
}

export function moveNotesToBin(entries: LibraryEntry[]) {
  if (entries.length === 0) return;
  const ids = entries.map((entry) => entry.id);
  setNotesTrashed(ids, Date.now());
  // A book left with only recordings becomes an audiobook.
  for (const bookId of new Set(entries.map((entry) => entry.bookId).filter(Boolean))) {
    void syncBookFormat(bookId as string);
  }
  toast(
    entries.length === 1 ? t("trash.moved") : t("trash.notesDeleted", { count: entries.length }),
    {
      description:
        entries.length === 1
          ? entries[0]?.title || undefined
          : t("trash.restoreWithin", { days: RETENTION_DAYS }),
      action: { label: t("common.undo"), onClick: () => setNotesTrashed(ids, null) },
    },
  );
}

export function moveBooksToBin(books: BookEntry[]) {
  moveSeriesToBin([], books);
}

/** Live items of a series, the ones a series delete takes with it. */
export const liveSeriesItems = (series: SeriesEntry) =>
  getBookStore()
    .getSnapshot()
    .filter((book) => book.seriesId === series.id);

/**
 * Deletes whole series with all their live items, plus any single books
 * picked alongside, in one transaction and one batch, so Undo, Restore and
 * the erase after a week treat each series as one unit.
 */
export function moveSeriesToBin(series: SeriesEntry[], books: BookEntry[]) {
  const taken = new Set(series.map((entry) => entry.id));
  const loose = books.filter((book) => !book.seriesId || !taken.has(book.seriesId));
  if (series.length === 0 && loose.length === 0) return;
  const batch = createId();
  const now = Date.now();
  const members = series.map((entry) => ({ entry, items: liveSeriesItems(entry) }));
  getLibrary().doc.transact(() => {
    for (const { entry, items } of members) {
      getSeriesStore().update(entry.id, { trashedAt: now, trashBatch: batch });
      setBooksTrashed(items, now, batch);
    }
    setBooksTrashed(loose, now);
  });
  const undo = () =>
    getLibrary().doc.transact(() => {
      for (const { entry, items } of members) {
        getSeriesStore().update(entry.id, { trashedAt: null, trashBatch: null });
        setBooksTrashed(items, null);
      }
      setBooksTrashed(loose, null);
    });
  const single = series.length === 0 && loose.length === 1 ? loose[0] : undefined;
  toast(
    single
      ? t("trash.moved")
      : t("trash.deleted", { what: countLabel(series.length, loose.length) }),
    {
      description: single
        ? single.title || undefined
        : t("trash.restoreWithin", { days: RETENTION_DAYS }),
      action: { label: t("common.undo"), onClick: undo },
    },
  );
}

export function restoreNote(entry: LibraryEntry) {
  setNotesTrashed([entry.id], null);
  toast.success(t("trash.restored"), { description: entry.title || undefined });
}

/** A single book comes back on its own; its series shows again with it. */
export function restoreBook(book: BookEntry) {
  setBooksTrashed([book], null);
  toast.success(t("trash.restored"), { description: book.title || undefined });
}

/** The items deleted in a series' batch that are still in the bin. */
export function batchItems(series: SeriesEntry): BookEntry[] {
  if (!series.trashBatch) return [];
  return getBookStore()
    .getTrashed()
    .filter((book) => book.seriesId === series.id && book.trashBatch === series.trashBatch);
}

/** Brings back a series and exactly the items deleted with it. */
export function restoreSeries(series: SeriesEntry) {
  const items = batchItems(series);
  getLibrary().doc.transact(() => {
    getSeriesStore().update(series.id, { trashedAt: null, trashBatch: null });
    setBooksTrashed(items, null);
  });
  toast.success(t("trash.restored"), { description: series.title || undefined });
}

/** What's in the bin: notes on their own, books on their own, and series. */
export function binContents() {
  const trashed = getBookStore().getTrashed();
  const { series, books } = binSeriesAndBooks(trashed, getSeriesStore().getSnapshot());
  return { notes: binNotes(getLibrary().getSnapshot(), trashed), books, series };
}

export async function eraseNotes(entries: LibraryEntry[]) {
  await Promise.all(entries.map((entry) => deleteNote(entry.id).catch(() => {})));
}

export async function eraseBooks(books: BookEntry[]) {
  for (const book of books) await eraseBook(book).catch(() => {});
}

/**
 * Erases a deleted series' batch. Each item is read again first and
 * erased only while it still carries the batch, so this is safe to repeat
 * or resume. `eraseBook` removes the series once no item names it; if
 * items outside the batch remain, the series simply leaves the bin.
 */
export async function eraseSeries(series: SeriesEntry) {
  const batch = series.trashBatch;
  if (!batch) return;
  const store = getBookStore();
  const ids = batchItems(series).map((book) => book.id);
  for (const id of ids) {
    const current = store.books.get(id);
    if (current?.trashedAt && current.trashBatch === batch)
      await eraseBook(current).catch(() => {});
  }
  const seriesStore = getSeriesStore();
  const left = seriesStore.series.get(series.id);
  if (left && left.trashBatch === batch) {
    seriesStore.update(series.id, { trashedAt: null, trashBatch: null });
  }
}

export async function emptyBin() {
  const { notes, books, series } = binContents();
  for (const entry of series) await eraseSeries(entry);
  await eraseBooks(books);
  await eraseNotes(notes);
  toast(t("trash.erased", { count: notes.length + books.length + series.length }));
}

/** Erases whatever has been in the bin longer than the retention period. */
export async function eraseExpired(now = Date.now()) {
  const { notes, books, series } = binContents();
  for (const entry of series) {
    if (entry.trashedAt && isExpired(entry.trashedAt, now)) await eraseSeries(entry);
  }
  await eraseBooks(books.filter((book) => book.trashedAt && isExpired(book.trashedAt, now)));
  await eraseNotes(notes.filter((entry) => entry.trashedAt && isExpired(entry.trashedAt, now)));
}
