import { createStore, useSelector } from "@tanstack/react-store";
import { useEffect } from "react";
import type { AudiobookPlayback } from "../../books/reader/audio/use-audiobook";

/**
 * The audiobook playing right now, wherever the listener is in the app.
 * One book plays at a time; opening another replaces it.
 */
interface ListeningState {
  bookId: string | null;
  playback: AudiobookPlayback | null;
}

const listening = createStore<ListeningState>({ bookId: null, playback: null });

export function openAudiobook(bookId: string) {
  if (listening.get().bookId === bookId) return;
  listening.setState(() => ({ bookId, playback: null }));
}

export function closeAudiobook() {
  listening.setState(() => ({ bookId: null, playback: null }));
}

/** Called by the session as playback changes. */
export function publishPlayback(bookId: string, playback: AudiobookPlayback) {
  if (listening.get().bookId !== bookId) return;
  listening.setState(() => ({ bookId, playback }));
}

export function useListening(): ListeningState {
  return useSelector(listening);
}

/** Only the book playing; doesn't change as playback moves on. */
export function useListeningBookId(): string | null {
  return useSelector(listening, (state) => state.bookId);
}

/** Starts (or returns to) a book's audiobook and follows its playback. */
export function useAudiobookSession(bookId: string): AudiobookPlayback | null {
  useEffect(() => openAudiobook(bookId), [bookId]);
  const current = useListening();
  return current.bookId === bookId ? current.playback : null;
}
