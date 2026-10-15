/**
 * Voices for reading aloud: the natural voice, downloaded to the device,
 * and Gemini's when the person has set up a Gemini key. The device's own
 * voices are left out: they sound too robotic to listen to.
 */

import type { NaturalVoiceInfo } from "./natural-voice";

export type VoiceProvider = "gemini" | "device-neural";

export interface Voice {
  id: string;
  provider: VoiceProvider;
  /** A short, friendly name. */
  name: string;
  /** BCP 47 language tag, or "*" for voices that speak any language. */
  lang: string;
  /** Works without a connection. */
  offline: boolean;
  /** The pack's default style of the natural voice. */
  preferred?: boolean;
}

/** Gemini's prebuilt voices speak every language they support. */
export const geminiVoices: Voice[] = [
  ["Kore", "Firm"],
  ["Puck", "Upbeat"],
  ["Charon", "Informative"],
  ["Aoede", "Breezy"],
  ["Fenrir", "Excitable"],
  ["Leda", "Youthful"],
  ["Orus", "Firm"],
  ["Zephyr", "Bright"],
].map(([name, mood]) => ({
  id: `gemini:${name}`,
  provider: "gemini" as const,
  name: `${name} · ${mood}`,
  lang: "*",
  offline: false,
}));

const languageOf = (tag: string) => tag.toLowerCase().split(/[-_]/)[0] ?? "";

/**
 * The natural voice's styles, when it speaks `lang`. Each style keeps its
 * proper name; `describe` gives the translated descriptor for a style id.
 */
export function naturalVoices(
  info: NaturalVoiceInfo | null,
  lang: string,
  describe: (styleId: string) => string,
): Voice[] {
  if (!info?.languages.includes(languageOf(lang))) return [];
  return info.styles.map((style) => ({
    id: `device-neural:${style.id}`,
    provider: "device-neural" as const,
    name: `${style.name} · ${describe(style.id)}`,
    lang,
    offline: true,
    preferred: style.id === info.defaultStyle,
  }));
}

/**
 * Voices for a language, best first: the natural voice on the device
 * (its default style leading), then Gemini's online voices.
 */
export function rankVoices(voices: Voice[], lang: string): Voice[] {
  const base = languageOf(lang);
  const score = (voice: Voice) =>
    (voice.provider === "device-neural" ? 4 : 0) +
    (voice.preferred ? 2 : 0) +
    (voice.offline ? 1 : 0);
  const seen = new Set<string>();
  return voices
    .filter((voice) => !seen.has(voice.id) && seen.add(voice.id))
    .filter((voice) => voice.lang === "*" || languageOf(voice.lang) === base)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}
