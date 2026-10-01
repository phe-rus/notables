import { useCallback, useState } from "react";

const key = (bookId: string) => `notables:reading:${bookId}`;

/** Remembers where the reader left off in each book, on this device. */
export function useReadingPosition(bookId: string, initial: number) {
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(key(bookId));
      return saved === null ? initial : Number(saved);
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: number) => {
      setPosition(next);
      try {
        localStorage.setItem(key(bookId), String(next));
      } catch {
        // Position simply isn't remembered without storage.
      }
    },
    [bookId],
  );

  return [position, update] as const;
}
