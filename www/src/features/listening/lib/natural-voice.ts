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
