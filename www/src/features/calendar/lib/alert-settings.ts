import { useSyncExternalStore } from "react";

/** How reminders get attention on this device. */
export interface AlertSettings {
  sound: boolean;
  haptics: boolean;
}

const STORAGE_KEY = "notables:alert-settings";
const defaults: AlertSettings = { sound: true, haptics: true };
const listeners = new Set<() => void>();
let cached: AlertSettings | undefined;

export function getAlertSettings(): AlertSettings {
  if (cached) return cached;
  try {
    cached = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    cached = defaults;
  }
  return cached ?? defaults;
}

export function setAlertSettings(change: Partial<AlertSettings>) {
  cached = { ...getAlertSettings(), ...change };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Kept for this session only.
  }
  for (const listener of listeners) listener();
}

export function useAlertSettings(): AlertSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getAlertSettings,
    () => defaults,
  );
}
