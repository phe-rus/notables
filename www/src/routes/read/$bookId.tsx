import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useBookKind } from "../../features/books/lib/book-kind";
import { AudiobookPlayer } from "../../features/books/reader/audio/audiobook-player";
import { BookReader } from "../../features/books/reader/book-reader";
import { ComicReader } from "../../features/books/reader/comic/comic-reader";
import { type BookEntry, useBook } from "../../features/books/store/book-store";
import { useLibraryReady } from "../../features/library/store/library-store";
import { markAppReady } from "../../platform/app-ready";

export const Route = createFileRoute("/read/$bookId")({
  // Books are assembled from notes stored on this device.
  ssr: false,
  component: ReadRoute,
});

function ReadRoute() {
  const { bookId } = Route.useParams();
  const book = useBook(bookId);
  const ready = useLibraryReady();
  useEffect(() => {
    if (ready) markAppReady();
  }, [ready]);

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
  return <ReaderFor book={book} />;
}

/** Each kind opens in its own reader. */
function ReaderFor({ book }: { book: BookEntry }) {
  const kind = useBookKind(book);
  if (kind === "comic" || kind === "manga") return <ComicReader book={book} />;
  if (kind === "audiobook") return <AudiobookPlayer book={book} />;
  return <BookReader book={book} />;
}
