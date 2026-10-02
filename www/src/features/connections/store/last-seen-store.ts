import { useSyncExternalStore } from "react";

const KEY = "notables:last-seen";

type Seen = Record<string, number>;

const listeners = new Set<() => void>();
let cached: Seen | undefined;

function read(): Seen {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    cached = parsed && typeof parsed === "object" ? (parsed as Seen) : {};
  } catch {
    cached = {};
  }
  return cached;
}

/** When this device last saw each person online, by person key. Kept on the device. */
export function markSeen(keys: readonly string[], now = Date.now()) {
  if (keys.length === 0) return;
  cached = { ...read(), ...Object.fromEntries(keys.map((key) => [key, now])) };
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    // Remembered for this session.
  }
  for (const listener of listeners) listener();
}

export function useLastSeen(): Seen {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => EMPTY,
  );
}

const EMPTY: Seen = {};
