import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../../../platform/runtime";

/** The installed natural voice pack, as `voice_info` reports it. */
export interface NaturalVoiceInfo {
  version: string;
  languages: string[];
  styles: { id: string; name: string }[];
  defaultStyle: string | null;
  sampleRate: number | null;
}

/** The pace range the natural voice still sounds right in (measured, spec 0001). */
export const NATURAL_PACE = { min: 0.8, max: 1.5 } as const;

export const clampPace = (rate: number) =>
  Math.min(NATURAL_PACE.max, Math.max(NATURAL_PACE.min, Number.isFinite(rate) ? rate : 1));

/** Raised when the pack was deleted under a session, so it can fall back. */
export class NaturalVoiceMissing extends Error {
  constructor() {
    super("The natural voice is not installed.");
    this.name = "NaturalVoiceMissing";
  }
}

/** The installed voice, or null on the web or when it isn't downloaded. */
export async function naturalVoiceInfo(): Promise<NaturalVoiceInfo | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<NaturalVoiceInfo | null>("voice_info");
  } catch {
    return null;
  }
}

/** Loads the voice ahead of the first line. */
export function warmNaturalVoice() {
  if (isTauri()) void invoke("voice_warm").catch(() => {});
}

/** Speaks text on the device: mono f32 samples at the pack's sample rate. */
export async function synthesizeNatural(request: {
  text: string;
  lang: string;
  version: string;
  style: string | null;
  speed: number;
  /** Fewer flow matching steps for devices that can't keep up. */
  steps?: number;
}): Promise<Float32Array> {
  try {
    const bytes = await invoke<ArrayBuffer>("voice_synthesize", request);
    return new Float32Array(bytes);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "not-installed") throw new NaturalVoiceMissing();
    throw new Error((error as { message?: string } | null)?.message ?? String(error));
  }
}

const STEPS_KEY = "notables:voice:steps";
const STEPS = { max: 5, min: 3 } as const;

/**
 * The natural voice's steps on this device. Five sound smoothest; a phone
 * that can't render a line before the last one ends gets fewer, measured
 * on the phone itself, and keeps them for next time.
 */
export const voiceSteps = {
  get(): number {
    try {
      const saved = Number(localStorage.getItem(STEPS_KEY));
      if (saved >= STEPS.min && saved <= STEPS.max) return saved;
    } catch {
      // Storage refused: start at full quality.
    }
    return STEPS.max;
  },

  /** Adjusts after a line took `renderMs` to make `audioMs` of speech. */
  learn(renderMs: number, audioMs: number): number {
    const current = voiceSteps.get();
    const ratio = renderMs / Math.max(audioMs, 1);
    // Rendering must stay ahead of reading, with room for a busy moment.
    const next =
      ratio > 0.85
        ? Math.max(STEPS.min, current - 1)
        : ratio < 0.45
          ? Math.min(STEPS.max, current + 1)
          : current;
    if (next !== current) {
      try {
        localStorage.setItem(STEPS_KEY, String(next));
      } catch {
        // Not remembered; measured again next time.
      }
    }
    return next;
  },
};
