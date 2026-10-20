import { composeDocumentFromMarkdown } from "@notables/pluraliti";
import { getBookStore } from "@/features/books/store/book-store";
import { writeNote } from "@/features/library/lib/write-note";
import { getLibrary } from "@/features/library/store/library-store";
import { welcomeBook, welcomeNotes } from "../content/welcome-library";
import { type Examples, recordExamples } from "./examples";
import { seedWelcomeShelf } from "./seed-welcome-shelf";

const WELCOMED = "notables:welcomed";
/** Set once the examples for manga, comics, articles, invoices and more are in. */
const SHELF = "notables:welcomed-shelf";
const HOUR = 3_600_000;

function done(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return true;
  }
}

function markDone(key: string) {
  try {
    localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Without storage the library is no longer empty next time, so it won't repeat.
  }
}

/** Starting fresh: the examples are never written on this device. */
export function skipWelcomeExamples() {
  markDone(WELCOMED);
  markDone(SHELF);
}

let seeding: Promise<void> | undefined;

/**
 * Fills an empty library, once per device, with a short guide and an
 * example in every place: journal, stories made into a book, an article,
 * a plan, a lesson, a manga, a comic and an invoice. Each is ordinary
 * content people can edit or delete. Devices welcomed before the later
 * examples existed get just those, once.
 */
export function seedWelcomeLibrary(): Promise<void> {
  const fresh = !done(WELCOMED) && getLibrary().entries.size === 0;
  const shelf = !done(SHELF) && (fresh || done(WELCOMED));
  if (fresh) markDone(WELCOMED);
  if (shelf) markDone(SHELF);
  if (!fresh && !shelf) return Promise.resolve();
  seeding ??= (async () => {
    if (fresh) recordExamples(await seed());
    if (shelf) recordExamples(await seedWelcomeShelf());
  })();
  return seeding;
}

/** Writes every example again, for people who started fresh and want them after all. */
export async function seedExamplesAgain() {
  recordExamples(await seed());
  recordExamples(await seedWelcomeShelf());
}

async function seed(): Promise<Examples> {
  const now = Date.now();
  const ids = new Map<string, string>();

  for (const note of welcomeNotes) {
    const entry = await writeNote({
      kind: note.kind,
      pinned: note.pinned,
      updatedAt: now - note.hoursAgo * HOUR,
      compose: (doc) => composeDocumentFromMarkdown(doc, note.markdown),
    });
    ids.set(note.key, entry.id);
  }

  const books = getBookStore();
  const book = books.create();
  books.update(book.id, {
    title: welcomeBook.title,
    subtitle: welcomeBook.subtitle,
    author: welcomeBook.author,
  });
  for (const key of welcomeBook.chapters) {
    const noteId = ids.get(key);
    if (noteId) books.addChapter(book.id, noteId);
  }
  return { notes: [...ids.values()], books: [book.id], invoices: [] };
}
