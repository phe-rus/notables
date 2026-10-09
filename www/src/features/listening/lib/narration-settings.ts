import { useSyncExternalStore } from "react";
import { t } from "../../../i18n/i18n";

/** The voice and pace for reading aloud, remembered on this device. */
export interface NarrationSettings {
  /** A voice id from voices.ts, or null for the best available. */
  voiceId: string | null;
  rate: number;
  /** Phones fetch voice downloads over mobile data, not only Wi-Fi. */
  downloadOnMobileData: boolean;
}

export const NARRATION_RATES = [0.8, 1, 1.15, 1.3, 1.5, 1.75] as const;

const rateNames = ["slow", "normal", "brisk", "fast", "faster", "fastest"] as const;

/**
 * A pace in words, so people know which they're on: "Normal", "Fast"…
 * `steps` are the speeds offered, slowest first, with 1× second.
 */
export function rateName(rate: number, steps: readonly number[] = NARRATION_RATES): string {
  const index = steps.indexOf(rate);
  const name = rateNames[index];
  return name ? t(`listening.rates.${name}`) : `${rate}×`;
}

const KEY = "notables:narration";
const defaults: NarrationSettings = { voiceId: null, rate: 1, downloadOnMobileData: false };
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
