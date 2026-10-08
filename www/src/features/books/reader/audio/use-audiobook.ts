import { useMediaSource } from "@notables/pluraliti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ChapterRecording, chapterRecordings } from "../../lib/chapter-media";
import type { BookEntry } from "../../store/book-store";
import type { BookChapter } from "../use-book-content";

export interface Track extends ChapterRecording {
  title: string;
  chapter: number;
  /** The part this track opens, if it opens one. */
  part?: string;
}

export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
/** Minutes, or "chapter" to stop when the current chapter ends. */
export type SleepTimer = null | 15 | 30 | 60 | "chapter";

interface SavedPlace {
  track: number;
  time: number;
  speed: number;
}

const placeKey = (bookId: string) => `notables:listening:${bookId}`;

function loadPlace(bookId: string): SavedPlace {
  try {
    const saved = JSON.parse(localStorage.getItem(placeKey(bookId)) ?? "null");
    if (saved && typeof saved.track === "number") return { speed: 1, ...saved };
  } catch {
    // Start from the beginning.
  }
  return { track: 0, time: 0, speed: 1 };
}

function savePlace(bookId: string, place: SavedPlace) {
  try {
    localStorage.setItem(placeKey(bookId), JSON.stringify(place));
  } catch {
    // The place simply isn't remembered without storage.
  }
}

/**
 * Plays an audiobook chapter after chapter, remembering where the listener
 * stopped. The system's media controls (lock screen, headphones, media
 * keys, the menu bar) drive it through the Media Session API.
 */
export function useAudiobook(
  book: BookEntry,
  chapters: BookChapter[] | null,
  cover: string | null,
) {
  const tracks = useMemo<Track[]>(
    () =>
      (chapters ?? []).flatMap((chapter, index) =>
        chapterRecordings(chapter.document).map((recording, position) => ({
          ...recording,
          title: chapter.title,
          chapter: index,
          // The first track of a part carries its title for the chapter list.
          ...(position === 0 && chapter.part ? { part: chapter.part.title } : {}),
        })),
      ),
    [chapters],
  );

  const audio = useRef<HTMLAudioElement | null>(null);
  const initial = useRef(loadPlace(book.id));
  const [index, setIndex] = useState(initial.current.track);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(initial.current.time);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(initial.current.speed);
  const [sleep, setSleep] = useState<SleepTimer>(null);
  const [sleepAt, setSleepAt] = useState<number | null>(null);
  /** Why the current chapter can't play, when it can't. */
  const [failed, setFailed] = useState(false);
  const resume = useRef<{ time: number; play: boolean } | null>({
    time: initial.current.time,
    play: false,
  });

  const track = tracks[Math.min(index, Math.max(0, tracks.length - 1))];
  const src = useMediaSource(track?.src ?? "");

  const refused = useCallback(
    (error: unknown) => {
      // An interrupted play() (pausing, changing chapter) is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      const detail =
        error instanceof MediaError ? `MediaError ${error.code}: ${error.message}` : String(error);
      console.warn("Audiobook playback failed", track?.src, src, detail);
      setPlaying(false);
      setFailed(true);
    },
    [src, track?.src],
  );

  if (!audio.current && typeof Audio !== "undefined") {
    audio.current = new Audio();
    audio.current.preload = "auto";
  }

  const remember = useCallback(
    (overrides: Partial<SavedPlace> = {}) =>
      savePlace(book.id, {
        track: index,
        time: audio.current?.currentTime ?? 0,
        speed,
        ...overrides,
      }),
    [book.id, index, speed],
  );

  // Which track the element's file belongs to. While a new track's file is
  // still resolving, `src` briefly holds the previous one.
  const loaded = useRef<{ index: number; src: string } | null>(null);

  // Load the current track, picking up where playback should resume.
  useEffect(() => {
    const element = audio.current;
    if (!element || !src) return;
    if (loaded.current && loaded.current.src === src && loaded.current.index !== index) return;
    if (element.src !== src) element.src = src;
    loaded.current = { index, src };
    element.playbackRate = speed;
    const pending = resume.current;
    const start = () => {
      if (pending) {
        element.currentTime = Math.min(pending.time, element.duration || pending.time);
        resume.current = null;
        if (pending.play) void element.play().catch(refused);
      }
    };
    if (element.readyState >= 1) start();
    else element.addEventListener("loadedmetadata", start, { once: true });
    return () => element.removeEventListener("loadedmetadata", start);
  }, [index, src, speed, refused]);

  const playTrack = useCallback(
    (next: number, at = 0, play = true) => {
      if (next < 0 || next >= tracks.length) return;
      resume.current = { time: at, play };
      setIndex(next);
      setTime(at);
      remember({ track: next, time: at });
      const element = audio.current;
      // Same file (rare): apply the resume straight away.
      if (element && next === index && element.readyState >= 1) {
        element.currentTime = at;
        resume.current = null;
        if (play) void element.play().catch(refused);
      }
    },
    [index, refused, remember, tracks.length],
  );

  const toggle = useCallback(() => {
    const element = audio.current;
    if (!element) return;
    if (!src) {
      refused(new Error(`No playable source for ${track?.src ?? "this chapter"}`));
      return;
    }
    if (element.paused) void element.play().catch(refused);
    else element.pause();
  }, [refused, src, track?.src]);

  const seek = useCallback((seconds: number) => {
    const element = audio.current;
    if (!element) return;
    element.currentTime = Math.max(0, Math.min(seconds, element.duration || seconds));
    setTime(element.currentTime);
  }, []);

  const skip = useCallback(
    (seconds: number) => seek((audio.current?.currentTime ?? 0) + seconds),
    [seek],
  );

  const setSpeed = useCallback(
    (next: number) => {
      setSpeedState(next);
      if (audio.current) audio.current.playbackRate = next;
      remember({ speed: next });
    },
    [remember],
  );

  const setSleepTimer = useCallback((next: SleepTimer) => {
    setSleep(next);
    setSleepAt(typeof next === "number" ? Date.now() + next * 60_000 : null);
  }, []);

  // Element events: progress, play state, and moving on at the end of a chapter.
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let lastSaved = 0;
    const onTime = () => {
      setTime(element.currentTime);
      if (Date.now() - lastSaved > 4000) {
        lastSaved = Date.now();
        remember();
      }
    };
    const onPlay = () => {
      setPlaying(true);
      setFailed(false);
    };
    const onError = () => refused(element.error);
    const onPause = () => {
      setPlaying(false);
      remember();
    };
    const onDuration = () => setDuration(Number.isFinite(element.duration) ? element.duration : 0);
    const onEnded = () => {
      if (sleep === "chapter") {
        setSleepTimer(null);
        setPlaying(false);
        return;
      }
      if (index + 1 < tracks.length) playTrack(index + 1);
      else {
        setPlaying(false);
        remember({ track: 0, time: 0 });
      }
    };
    element.addEventListener("timeupdate", onTime);
    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("durationchange", onDuration);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    return () => {
      element.removeEventListener("error", onError);
      element.removeEventListener("timeupdate", onTime);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("durationchange", onDuration);
      element.removeEventListener("ended", onEnded);
    };
  }, [index, playTrack, refused, remember, setSleepTimer, sleep, tracks.length]);

  // A timed sleep fades out over the last few seconds, then pauses.
  useEffect(() => {
    if (!sleepAt) return;
    const timer = window.setInterval(() => {
      const element = audio.current;
      if (!element) return;
      const left = sleepAt - Date.now();
      if (left <= 0) {
        element.pause();
        element.volume = 1;
        setSleepTimer(null);
      } else if (left < 8000) {
        element.volume = Math.max(0, left / 8000);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [setSleepTimer, sleepAt]);

  // Stop playing when the listening session ends.
  useEffect(
    () => () => {
      audio.current?.pause();
    },
    [],
  );

  // System media controls.
  const coverUrl = useMediaSource(cover ?? "");
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: book.author || undefined,
      album: book.title,
      artwork: cover && coverUrl ? [{ src: coverUrl, sizes: "512x512" }] : [],
    });
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => void audio.current?.play()],
      ["pause", () => audio.current?.pause()],
      ["seekbackward", (details) => skip(-(details.seekOffset ?? 15))],
      ["seekforward", (details) => skip(details.seekOffset ?? 30)],
      ["previoustrack", () => playTrack(index - 1)],
      ["nexttrack", () => playTrack(index + 1)],
      ["seekto", (details) => details.seekTime !== undefined && seek(details.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Not every system offers every control.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // As above.
        }
      }
    };
  }, [book.author, book.title, cover, coverUrl, index, playTrack, seek, skip, track]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    if (duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          position: Math.min(time, duration),
          playbackRate: speed,
        });
      } catch {
        // Older engines don't report position.
      }
    }
  }, [duration, playing, speed, time]);

  return {
    /** Chapters have loaded, so an empty track list really is empty. */
    ready: chapters !== null,
    tracks,
    index: track ? index : -1,
    track,
    playing,
    failed,
    time,
    duration: duration || (track ? track.durationMs / 1000 : 0),
    speed,
    sleep,
    sleepAt,
    toggle,
    seek,
    skip,
    playTrack,
    setSpeed,
    setSleepTimer,
  };
}

export type AudiobookPlayback = ReturnType<typeof useAudiobook>;
