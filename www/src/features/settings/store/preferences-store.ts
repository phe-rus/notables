import { useSyncExternalStore } from "react";
import { defaultPreferences, normalizePreferences, type Preferences } from "../model/preferences";

const STORAGE_KEY = "notables:preferences";

let current: Preferences | undefined;
const listeners = new Set<() => void>();

function read(): Preferences {
  if (current) return current;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    current = normalizePreferences(stored ? JSON.parse(stored) : {});
  } catch {
    current = defaultPreferences;
  }
  return current;
}

export function getPreferences(): Preferences {
  return typeof window === "undefined" ? defaultPreferences : read();
}

export function updatePreferences(change: (previous: Preferences) => Preferences): void {
  current = normalizePreferences(change(read()));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private windows may refuse storage; the change still applies for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other windows of the app in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    current = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences, () => defaultPreferences);
}

export function toggleSidebarCollapsed(): void {
  updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, collapsed: !p.sidebar.collapsed } }));
}
