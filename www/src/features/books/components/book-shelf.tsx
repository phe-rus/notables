import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { arrangeShelf } from "../lib/arrange-shelf";
import { kindOfBook } from "../lib/book-kind";
import type { MediaKind } from "../model/media-kind";
import { type BookEntry, useBooks } from "../store/book-store";
import { useSeries } from "../store/series-store";
import { BookCover } from "./book-cover";

/** The books on a shelf, with each series' volumes together and in order. */
export function useShelfBooks(kind: MediaKind): BookEntry[] {
  const books = useBooks();
  const series = useSeries();
  return useMemo(
    () =>
      arrangeShelf(
        books.filter((book) => kindOfBook(book) === kind),
        series,
      ).flatMap((item) => (item.type === "book" ? [item.book] : item.books)),
    [books, series, kind],
  );
}

/** Bound manga or comics as a row of covers above the drafts of that kind. */
export function BookShelf({ books, label }: { books: BookEntry[]; label: string }) {
  if (books.length === 0) return null;
  return (
    <section aria-label={label} className="flex flex-col gap-2 pt-2 pb-1">
      <h2 className="px-2.5 text-[12px] font-medium text-label-tertiary">{label}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-2.5 pb-3">
        {books.map((book) => (
          <Link
            key={book.id}
            to="/books/$bookId"
            params={{ bookId: book.id }}
            className="flex w-[84px] shrink-0 flex-col gap-1.5 no-underline transition-transform active:scale-[0.97]"
          >
            <BookCover
              title={book.title}
              author={book.author}
              image={book.cover}
              className="w-full"
            />
            <span className="line-clamp-2 text-[12px] leading-tight font-medium text-label">
              {book.title || "Untitled"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
