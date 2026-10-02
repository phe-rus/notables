import { useEffect, useSyncExternalStore } from "react";
import type { AudiobookPlayback } from "../../books/reader/audio/use-audiobook";

/**
 * The audiobook playing right now, wherever the listener is in the app.
 * One book plays at a time; opening another replaces it.
 */
interface ListeningState {
  bookId: string | null;
  playback: AudiobookPlayback | null;
}

let state: ListeningState = { bookId: null, playback: null };
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function openAudiobook(bookId: string) {
  if (state.bookId === bookId) return;
  state = { bookId, playback: null };
  emit();
}

export function closeAudiobook() {
  state = { bookId: null, playback: null };
  emit();
}

/** Called by the session as playback changes. */
export function publishPlayback(bookId: string, playback: AudiobookPlayback) {
  if (state.bookId !== bookId) return;
  state = { bookId, playback };
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useListening(): ListeningState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

/** Only the book playing; doesn't change as playback moves on. */
export function useListeningBookId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => state.bookId,
    () => null,
  );
}

/** Starts (or returns to) a book's audiobook and follows its playback. */
export function useAudiobookSession(bookId: string): AudiobookPlayback | null {
  useEffect(() => openAudiobook(bookId), [bookId]);
  const current = useListening();
  return current.bookId === bookId ? current.playback : null;
}
