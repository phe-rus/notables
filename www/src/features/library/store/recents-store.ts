import { useSyncExternalStore } from "react";

const KEY = "notables:recents";

/** Notes opened within this long show under Recents. */
export const RECENT_WINDOW = 2 * 24 * 60 * 60 * 1000;

type Opened = Record<string, number>;

const listeners = new Set<() => void>();
let cached: Opened | undefined;

/**
 * When each note was last opened on this device. Kept on the device, not
 * in the library document: opening a note shouldn't sync to every other
 * device, and each device has its own recent work.
 */
function read(): Opened {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    cached = parsed && typeof parsed === "object" ? (parsed as Opened) : {};
  } catch {
    cached = {};
  }
  return cached;
}

function write(next: Opened) {
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this session.
  }
  for (const listener of listeners) listener();
}

/** Notes past the window are dropped as new ones arrive. */
export function recordOpened(noteId: string, now = Date.now()) {
  const kept = Object.entries(read()).filter(
    ([id, at]) => id !== noteId && now - at < RECENT_WINDOW,
  );
  write({ ...Object.fromEntries(kept), [noteId]: now });
}

/** Every note opened on this device, with when; filter by `RECENT_WINDOW` at render. */
export function useOpened(): Opened {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => EMPTY,
  );
}

const EMPTY: Opened = {};
