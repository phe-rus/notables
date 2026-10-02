import { composeDocumentFromMarkdown } from "@notables/editor";
import * as Y from "yjs";
import { getPersistence } from "../../../platform/storage/document-storage";
import { saveNoteContent } from "../../../platform/storage/note-content-cache";
import { getBookStore } from "../../books/store/book-store";
import { summarize } from "../../library/model/library-views";
import { getLibrary } from "../../library/store/library-store";
import { documentText } from "../../search/lib/document-text";
import { welcomeBook, welcomeNotes } from "../content/welcome-library";

const WELCOMED = "notables:welcomed";
const HOUR = 3_600_000;

function alreadyWelcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED) !== null;
  } catch {
    return true;
  }
}

function markWelcomed() {
  try {
    localStorage.setItem(WELCOMED, new Date().toISOString());
  } catch {
    // Without storage the library is no longer empty next time, so it won't repeat.
  }
}

let seeding: Promise<void> | undefined;

/**
 * Fills an empty library, once per device, with a short guide and a few
 * examples: a journal entry, a three-chapter story made into a book, a plan
 * and a lesson. Each is a normal note people can edit or delete.
 */
export function seedWelcomeLibrary(): Promise<void> {
  if (alreadyWelcomed() || getLibrary().entries.size > 0) return Promise.resolve();
  markWelcomed();
  seeding ??= seed();
  return seeding;
}

async function seed() {
  const library = getLibrary();
  const persistence = getPersistence();
  const now = Date.now();
  const ids = new Map<string, string>();

  for (const note of welcomeNotes) {
    const entry = library.create(note.kind);
    ids.set(note.key, entry.id);

    const doc = new Y.Doc();
    const binding = await persistence.bind(`note:${entry.id}`, doc);
    const document = composeDocumentFromMarkdown(doc, note.markdown);
    await binding.flush?.();
    binding.destroy();
    await saveNoteContent(entry.id, document);

    const { title, excerpt } = summarize(documentText(document));
    const at = now - note.hoursAgo * HOUR;
    library.update(entry.id, {
      title,
      excerpt,
      pinned: note.pinned ?? false,
      updatedAt: at,
    });
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
}
