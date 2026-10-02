import { ChevronLeftIcon, IconButton, TrashIcon } from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo } from "react";
import { t } from "../../../i18n/i18n";
import { type LibraryEntry, useLibrary } from "../../library/store/library-store";
import { moveBooksToBin } from "../../trash/lib/recycle-bin";
import { syncBookFormat } from "../actions/sync-book-format";
import { type BookEntry, getBookStore, useBook } from "../store/book-store";
import { BookContents } from "./book-contents";
import { BookCover } from "./book-cover";

export function BookScreen({ bookId, actions }: { bookId: string; actions?: ReactNode }) {
  const book = useBook(bookId);
  if (!book) {
    return (
      <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="font-serif text-[24px] font-semibold">{t("books.notOnDevice")}</p>
        <Link to="/books" className="mt-2 font-semibold text-accent-text">
          {t("books.backToBooks")}
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

  // A book left with only recordings becomes an audiobook.
  useEffect(() => {
    if (chapters.length > 0) void syncBookFormat(book.id);
  }, [book.id, chapters.length]);

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
          <span className="max-sm:sr-only">{t("nav.books")}</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <IconButton label={t("books.deleteBook")} onClick={remove}>
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
              aria-label={t("books.bookTitle")}
              placeholder={t("books.untitled")}
              value={book.title}
              onChange={(e) => store.update(book.id, { title: e.target.value })}
              className="bg-transparent font-serif text-[34px] leading-tight font-semibold tracking-tight outline-none placeholder:text-label-tertiary"
            />
            <input
              aria-label={t("books.subtitle")}
              placeholder={t("books.subtitle")}
              value={book.subtitle}
              onChange={(e) => store.update(book.id, { subtitle: e.target.value })}
              className="bg-transparent text-[17px] text-label-secondary outline-none placeholder:text-label-tertiary"
            />
            <input
              aria-label={t("books.author")}
              placeholder={t("books.author")}
              value={book.author}
              onChange={(e) => store.update(book.id, { author: e.target.value })}
              className="bg-transparent text-[15px] font-medium outline-none placeholder:text-label-tertiary"
            />
          </div>
        </section>

        <BookContents book={book} chapters={chapters} />
      </div>
    </div>
  );
}
