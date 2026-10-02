import { memo, useEffect, useState } from "react";
import { useAudiobook } from "../../books/reader/audio/use-audiobook";
import { useBookContent } from "../../books/reader/use-book-content";
import { type BookEntry, useBook } from "../../books/store/book-store";
import { publishPlayback, useListeningBookId } from "../store/listening-store";

/**
 * Keeps the current audiobook playing while the listener moves around the
 * app. Renders nothing; the player and the mini player show its state.
 */
export function ListeningSession() {
  // Only the book id: following playback here would re-render in a loop.
  const bookId = useListeningBookId();
  const book = useBook(bookId ?? "");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !book) return null;
  return <Session key={book.id} book={book} />;
}

const Session = memo(function Session({ book }: { book: BookEntry }) {
  const chapters = useBookContent(book);
  const playback = useAudiobook(book, chapters, book.cover ?? null);
  useEffect(() => publishPlayback(book.id, playback));
  return null;
});
