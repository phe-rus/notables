import { useSyncExternalStore } from "react";
import { t } from "@/i18n/i18n";
import { syncedSetting } from "@/platform/settings/synced-settings";

/** The voice and pace for reading aloud, remembered on this device. */
export interface NarrationSettings {
  /** A voice id from voices.ts, or null for the natural voice's default style. */
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

const stored = syncedSetting("notables:narration");
const defaults: NarrationSettings = { voiceId: null, rate: 1, downloadOnMobileData: false };
let cached: NarrationSettings | undefined;
let cachedFrom: unknown;

export function getNarrationSettings(): NarrationSettings {
  const raw = stored.get();
  if (cached && raw === cachedFrom) return cached;
  cachedFrom = raw;
  const saved: NarrationSettings = { ...defaults, ...(raw as Partial<NarrationSettings>) };
  // The device's own voices were dropped; a choice of one falls back to the best.
  const known = /^(device-neural|gemini):/.test(saved.voiceId ?? "");
  cached = known ? saved : { ...saved, voiceId: null };
  return cached;
}

export function setNarrationSettings(change: Partial<NarrationSettings>) {
  stored.set({ ...getNarrationSettings(), ...change });
}

export function useNarrationSettings(): NarrationSettings {
  return useSyncExternalStore(stored.subscribe, getNarrationSettings, () => defaults);
}
