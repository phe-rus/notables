import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  CloseIcon,
  cn,
  IconButton,
  PlusIcon,
  SearchField,
  spring,
  TrashIcon,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { type BookEntry, getBookStore, useBook } from "../store/book-store";
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
    .filter((note): note is LibraryEntry => Boolean(note));

  const remove = () => {
    if (!window.confirm("Delete this book? Its chapters stay in your notes.")) return;
    store.remove(book.id);
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
          Books
        </Link>
        <div className="flex items-center gap-2">
          <IconButton label="Delete book" onClick={remove}>
            <TrashIcon size={19} />
          </IconButton>
          {actions}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10 px-6 pt-8 pb-24">
        <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <BookCover title={book.title} author={book.author} className="w-40" />
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
        <ChapterPicker book={book} notes={notes} />
      </div>
    </div>
  );
}

function ChapterList({ book, chapters }: { book: BookEntry; chapters: LibraryEntry[] }) {
  const store = getBookStore();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold tracking-[0.04em] text-label-tertiary uppercase">
        Chapters
      </h2>
      {chapters.length === 0 && (
        <p className="text-[15px] text-label-secondary">Add notes below to make chapters.</p>
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
              className="flex items-center gap-3 rounded-[16px] bg-elevated px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-separator)]"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-[13px] font-semibold text-label-secondary">
                {index + 1}
              </span>
              <span className="grow truncate font-serif text-[17px]">
                {note.title || "Untitled"}
              </span>
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
                label="Remove chapter"
                onClick={() => store.removeChapter(book.id, note.id)}
              >
                <CloseIcon size={17} />
              </ChapterButton>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
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
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[16px] text-label-secondary transition-colors hover:bg-fill disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ChapterPicker({ book, notes }: { book: BookEntry; notes: LibraryEntry[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const available = notes.filter(
    (n) =>
      !book.chapterIds.includes(n.id) &&
      (!deferredQuery || n.title.toLowerCase().includes(deferredQuery)),
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold tracking-[0.04em] text-label-tertiary uppercase">
        Add from your notes
      </h2>
      <SearchField value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="flex flex-col">
        {available.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => getBookStore().addChapter(book.id, note.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-fill/70",
              )}
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
          <li className="px-3 text-[14px] text-label-tertiary">No more notes to add.</li>
        )}
      </ul>
    </section>
  );
}
