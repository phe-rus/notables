import { useSyncExternalStore } from "react";
import type { ShareCredentials } from "../model/share";

const KEY = "notables:shares";
const listeners = new Set<() => void>();
let cached: ShareCredentials[] | undefined;

/** Shares this device takes part in. Secrets stay on this device. */
export function getShares(): ShareCredentials[] {
  if (cached) return cached;
  try {
    cached = JSON.parse(localStorage.getItem(KEY) ?? "[]") as ShareCredentials[];
  } catch {
    cached = [];
  }
  return cached;
}

function write(next: ShareCredentials[]) {
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this session.
  }
  for (const listener of listeners) listener();
}

export function saveShare(share: ShareCredentials) {
  write([...getShares().filter((s) => s.noteId !== share.noteId), share]);
}

export function forgetShare(noteId: string) {
  write(getShares().filter((s) => s.noteId !== noteId));
}

export function shareFor(noteId: string): ShareCredentials | undefined {
  return getShares().find((share) => share.noteId === noteId);
}

export function useShares(): ShareCredentials[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getShares,
    () => [],
  );
}
