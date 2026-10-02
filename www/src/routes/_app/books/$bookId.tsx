import { createFileRoute, Link } from "@tanstack/react-router";
import { BookScreen } from "../../../features/books/components/book-screen";
import { ExportBookButton } from "../../../features/books/export/export-book-button";
import { NarrateChapterButton } from "../../../features/books/narration/components/narrate-chapter-button";
import { bookFormat, useBook } from "../../../features/books/store/book-store";

export const Route = createFileRoute("/_app/books/$bookId")({
  component: BookRoute,
});

function BookRoute() {
  const { bookId } = Route.useParams();
  const book = useBook(bookId);
  return (
    <BookScreen
      key={bookId}
      bookId={bookId}
      actions={
        <>
          {book && <NarrateChapterButton book={book} />}
          {book && <ExportBookButton book={book} />}
          <Link
            to="/read/$bookId"
            params={{ bookId }}
            className="inline-flex h-[34px] items-center rounded-full bg-inverse px-4 text-[14px] font-semibold text-on-inverse no-underline transition-transform active:scale-[0.97]"
          >
            {book && bookFormat(book) === "audio" ? "Listen" : "Read"}
          </Link>
        </>
      }
    />
  );
}
