import { useSyncExternalStore } from "react";

/** The voice and pace for reading aloud, remembered on this device. */
export interface NarrationSettings {
  /** A voice id from voices.ts, or null for the best available. */
  voiceId: string | null;
  rate: number;
}

export const NARRATION_RATES = [0.8, 1, 1.15, 1.3, 1.5, 1.75] as const;

const KEY = "notables:narration";
const defaults: NarrationSettings = { voiceId: null, rate: 1 };
const listeners = new Set<() => void>();
let cached: NarrationSettings | undefined;

export function getNarrationSettings(): NarrationSettings {
  if (cached) return cached;
  try {
    cached = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cached = defaults;
  }
  return cached ?? defaults;
}

export function setNarrationSettings(change: Partial<NarrationSettings>) {
  cached = { ...getNarrationSettings(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    // Kept for this session.
  }
  for (const listener of listeners) listener();
}

export function useNarrationSettings(): NarrationSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getNarrationSettings,
    () => defaults,
  );
}
