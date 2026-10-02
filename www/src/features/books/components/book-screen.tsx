import type { NoteKind } from "@notables/core";
import {
  Button,
  CanvasIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  CloseIcon,
  IconButton,
  PlusIcon,
  SearchField,
  spring,
  TrashIcon,
  toast,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useDeferredValue, useMemo, useRef, useState } from "react";
import { IMPORT_ACCEPT, withPath } from "../../imports/lib/picked-files";
import { appendToBook } from "../../imports/lib/run-import";
import { noteKindPlural } from "../../library/model/note-kind-labels";
import { isListedNote, type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { queueDrawing } from "../../studio/lib/pending-drawing";
import { moveBooksToBin, moveNotesToBin } from "../../trash/lib/recycle-bin";
import { chapterKind, startChapter } from "../actions/start-chapter";
import { type BookEntry, bookShelf, getBookStore, useBook } from "../store/book-store";
import { BookCover } from "./book-cover";

export function BookScreen({ bookId, actions }: { bookId: string; actions?: ReactNode }) {
  const book = useBook(bookId);
  if (!book) {
    return (
      <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="font-serif text-[24px] font-semibold">This book isn’t on this device</p>
        <Link to="/books" className="mt-2 font-semibold text-accent-text">
          Back to books
        </Link>
      </div>
    );
  }
  return <BookEditor book={book} actions={actions} />;
}

function BookEditor({ book, actions }: { book: BookEntry; actions?: ReactNode }) {
  const navigate = useNavigate();
  const notes = useLibrary();
  const store = getBookStore();
  const notesById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);
  const chapters = book.chapterIds
    .map((id) => notesById.get(id))
    .filter((note): note is LibraryEntry => Boolean(note) && !note?.trashedAt);

  const remove = () => {
    moveBooksToBin([book]);
    void navigate({ to: "/books" });
  };

  return (
    <div className="relative flex min-h-0 grow flex-col overflow-y-auto">
      <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] md:px-5">
        <Link
          to="/books"
          className="flex min-h-11 items-center gap-0.5 px-1 text-[17px] text-accent-text no-underline md:invisible"
        >
          <ChevronLeftIcon size={22} strokeWidth={2.2} />
          <span className="max-sm:sr-only">Books</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <IconButton label="Delete book" onClick={remove}>
            <TrashIcon size={19} />
          </IconButton>
          {actions}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10 px-6 pt-8 pb-24">
        <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <BookCover title={book.title} author={book.author} image={book.cover} className="w-40" />
          <div className="flex w-full flex-col gap-2">
            <input
              aria-label="Book title"
              placeholder="Untitled book"
              value={book.title}
              onChange={(e) => store.update(book.id, { title: e.target.value })}
              className="bg-transparent font-serif text-[34px] leading-tight font-semibold tracking-tight outline-none placeholder:text-label-tertiary"
            />
            <input
              aria-label="Subtitle"
              placeholder="Subtitle"
              value={book.subtitle}
              onChange={(e) => store.update(book.id, { subtitle: e.target.value })}
              className="bg-transparent text-[17px] text-label-secondary outline-none placeholder:text-label-tertiary"
            />
            <input
              aria-label="Author"
              placeholder="Author"
              value={book.author}
              onChange={(e) => store.update(book.id, { author: e.target.value })}
              className="bg-transparent text-[15px] font-medium outline-none placeholder:text-label-tertiary"
            />
          </div>
        </section>

        <ChapterList book={book} chapters={chapters} />
      </div>
    </div>
  );
}

function ChapterList({ book, chapters }: { book: BookEntry; chapters: LibraryEntry[] }) {
  const store = getBookStore();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [adding, setAdding] = useState<{ label: string; progress: number } | null>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const kind = chapterKind(book);
  const drawn = bookShelf(book) !== "books";

  // E-books, PDFs, comic pages and audiobook tracks become chapters here.
  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setAdding({ label: "Reading files…", progress: 0 });
    try {
      const result = await appendToBook(
        book.id,
        files.map((file) => withPath(file)),
        {
          comicKind: bookShelf(book) === "comic" ? "comic" : "manga",
          onProgress: (label, done, total) =>
            setAdding({ label, progress: total ? done / total : 0 }),
        },
      );
      if (result.chapters === 0) {
        toast("Nothing to add", {
          description: "These files didn’t contain chapters Notables can read.",
        });
      } else {
        toast.success(
          result.chapters === 1 ? "Chapter added" : `${result.chapters} chapters added`,
          {
            description:
              result.skipped > 0
                ? `Skipped ${result.skipped} ${result.skipped === 1 ? "file" : "files"} it couldn’t read.`
                : undefined,
          },
        );
      }
    } catch (error) {
      toast.error("Couldn’t add those files", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAdding(null);
    }
  };

  // Comics and manga are drawn: open the last chapter straight into the studio.
  const drawPage = async () => {
    setStarting(true);
    try {
      const noteId = book.chapterIds.at(-1) ?? (await startChapter(book));
      queueDrawing(noteId);
      void navigate({ to: "/notes/$noteId", params: { noteId } });
    } finally {
      setStarting(false);
    }
  };

  const newChapter = async () => {
    setStarting(true);
    try {
      const noteId = await startChapter(book);
      void navigate({ to: "/notes/$noteId", params: { noteId } });
    } finally {
      setStarting(false);
    }
  };

  // A chapter written for this book goes to Recently Deleted; a borrowed
  // note just leaves the book and stays in the notes.
  const remove = (note: LibraryEntry) => {
    if (note.bookId === book.id) moveNotesToBin([note]);
    else store.removeChapter(book.id, note.id);
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold tracking-[0.04em] text-label-tertiary uppercase">
        Chapters
      </h2>
      {chapters.length === 0 && (
        <p className="text-[15px] text-label-secondary">
          {drawn
            ? "No pages yet. Draw the first one, or add pages from image files."
            : `No chapters yet. Start writing one, or add ${noteKindPlural[kind]} you’ve already written.`}
        </p>
      )}
      <ol className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {chapters.map((note, index) => (
            <motion.li
              key={note.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={spring.smooth}
              className="group flex items-center gap-1 rounded-[16px] bg-elevated pr-2 shadow-[inset_0_0_0_1px_var(--color-separator)] transition-colors hover:bg-fill/40"
            >
              <Link
                to="/notes/$noteId"
                params={{ noteId: note.id }}
                className="flex min-w-0 grow items-center gap-3 py-2.5 pl-3 no-underline"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-[13px] font-semibold text-label-secondary">
                  {index + 1}
                </span>
                <span className="grow truncate font-serif text-[17px] text-label">
                  {note.title || "Untitled"}
                </span>
              </Link>
              <ChapterButton
                label="Move up"
                disabled={index === 0}
                onClick={() => store.moveChapter(book.id, index, index - 1)}
              >
                <ChevronUpIcon size={18} />
              </ChapterButton>
              <ChapterButton
                label="Move down"
                disabled={index === chapters.length - 1}
                onClick={() => store.moveChapter(book.id, index, index + 1)}
              >
                <ChevronDownIcon size={18} />
              </ChapterButton>
              <ChapterButton
                label={note.bookId === book.id ? "Delete chapter" : "Remove from book"}
                onClick={() => remove(note)}
              >
                <CloseIcon size={17} />
              </ChapterButton>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        {drawn && (
          <Button variant="primary" disabled={starting} onClick={drawPage}>
            <CanvasIcon size={16} />
            Draw a page
          </Button>
        )}
        <Button variant={drawn ? "secondary" : "primary"} disabled={starting} onClick={newChapter}>
          <PlusIcon size={16} strokeWidth={2.2} />
          New chapter
        </Button>
        <Button
          variant="secondary"
          disabled={adding !== null}
          onClick={() => filesInput.current?.click()}
        >
          Add from files…
        </Button>
        <input
          ref={filesInput}
          type="file"
          multiple
          accept={IMPORT_ACCEPT}
          hidden
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void addFiles(files);
          }}
        />
        <Button
          variant="secondary"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          {picking ? "Done adding" : `Add ${noteKindPlural[kind]}…`}
        </Button>
      </div>
      {adding && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-fill/50 px-4 py-3" aria-live="polite">
          <p className="truncate text-[14px] text-label-secondary">{adding.label}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-fill">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${Math.max(4, adding.progress * 100)}%` }}
              transition={spring.smooth}
            />
          </div>
        </div>
      )}
      <AnimatePresence initial={false}>
        {picking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <ChapterPicker book={book} kind={kind} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ChapterButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[16px] text-label-secondary transition-colors hover:bg-fill disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Notes of the book's kind that aren't in it yet, to add as chapters. */
function ChapterPicker({ book, kind }: { book: BookEntry; kind: NoteKind }) {
  const notes = useLibrary();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const available = notes.filter(
    (n) =>
      isListedNote(n) &&
      n.kind === kind &&
      !book.chapterIds.includes(n.id) &&
      (!deferredQuery || n.title.toLowerCase().includes(deferredQuery)),
  );

  return (
    <div className="flex flex-col gap-2 pt-2">
      <SearchField
        value={query}
        placeholder={`Search ${noteKindPlural[kind]}`}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="flex flex-col">
        {available.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => getBookStore().addChapter(book.id, note.id)}
              className="group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-fill/70"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                <PlusIcon size={16} strokeWidth={2.2} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold">
                  {note.title || "New Note"}
                </span>
                <span className="truncate text-[13px] text-label-secondary">
                  {note.excerpt || "No additional text"}
                </span>
              </span>
            </button>
          </li>
        ))}
        {available.length === 0 && (
          <li className="px-3 py-2 text-[14px] text-label-tertiary">
            {deferredQuery
              ? "Nothing matches."
              : `No other ${noteKindPlural[kind]} to add yet. Ones you write in your library show up here.`}
          </li>
        )}
      </ul>
    </div>
  );
}
