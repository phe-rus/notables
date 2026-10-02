import { createFileRoute, Link } from "@tanstack/react-router";
import { AudiobookPlayer } from "../../features/books/reader/audio/audiobook-player";
import { BookReader } from "../../features/books/reader/book-reader";
import { ComicReader } from "../../features/books/reader/comic/comic-reader";
import { bookFormat, useBook } from "../../features/books/store/book-store";
import { useLibraryReady } from "../../features/library/store/library-store";

export const Route = createFileRoute("/read/$bookId")({
  // Books are assembled from notes stored on this device.
  ssr: false,
  component: ReadRoute,
});

function ReadRoute() {
  const { bookId } = Route.useParams();
  const book = useBook(bookId);
  const ready = useLibraryReady();

  if (!book) {
    return ready ? (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-paper p-10 text-center">
        <p className="font-serif text-[24px] font-semibold">This book isn’t on this device</p>
        <Link to="/books" className="font-semibold text-accent-text">
          Back to books
        </Link>
      </main>
    ) : null;
  }
  const format = bookFormat(book);
  if (format === "comic") return <ComicReader book={book} />;
  if (format === "audio") return <AudiobookPlayer book={book} />;
  return <BookReader book={book} />;
}
