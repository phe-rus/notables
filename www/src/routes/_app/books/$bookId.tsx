import { createFileRoute, Link } from "@tanstack/react-router";
import { BookScreen } from "../../../features/books/components/book-screen";
import { ExportBookButton } from "../../../features/books/export/export-book-button";
import { useBookKind } from "../../../features/books/lib/book-kind";
import { NarrateChapterButton } from "../../../features/books/narration/components/narrate-chapter-button";
import { type BookEntry, useBook } from "../../../features/books/store/book-store";
import { t } from "../../../i18n/i18n";

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
            {book ? <ReadLabel book={book} /> : t("books.action.read")}
          </Link>
        </>
      }
    />
  );
}

function ReadLabel({ book }: { book: BookEntry }) {
  return useBookKind(book) === "audiobook" ? t("books.action.listen") : t("books.action.read");
}
