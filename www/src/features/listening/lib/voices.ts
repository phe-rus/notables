/**
 * Voices for reading aloud: the natural voice that runs on the device, the
 * device's own voices, best-sounding first, and Gemini's when the person
 * has set up a Gemini key.
 */

import type { AndroidVoice } from "../../../platform/android-speech";
import type { NaturalVoiceInfo } from "./natural-voice";

export type VoiceProvider = "system" | "android" | "gemini" | "device-neural";

export interface Voice {
  id: string;
  provider: VoiceProvider;
  /** A short, friendly name. */
  name: string;
  /** BCP 47 language tag, or "*" for voices that speak any language. */
  lang: string;
  /** Neural or premium voices that sound like a person. */
  natural: boolean;
  /** Works without a connection. */
  offline: boolean;
  /** The pack's default style of the natural voice. */
  preferred?: boolean;
}

export const speechSupported = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof SpeechSynthesisUtterance !== "undefined";

/** System voices load lazily in some browsers; wait briefly for them. */
export function systemVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

const NATURAL = /natural|neural|premium|enhanced|siri|wavenet|journey|studio|online/i;

export function friendlyName(voice: SpeechSynthesisVoice): string {
  return (
    voice.name
      .replace(/^(Microsoft|Google|Apple)\s+/i, "")
      .replace(/\s*\((Natural|Enhanced|Premium)\)/gi, "")
      .replace(/\s+Online/i, "")
      .replace(/\s+-\s+.*$/, "")
      .trim() || voice.name
  );
}

/**
 * Names a device voice uniquely. Linux webviews leave `voiceURI` empty
 * for every voice, so fall back to its name and language.
 */
export const systemVoiceKey = (voice: SpeechSynthesisVoice) =>
  voice.voiceURI || `${voice.name}|${voice.lang}`;

export function fromSystem(voice: SpeechSynthesisVoice): Voice {
  return {
    id: `system:${systemVoiceKey(voice)}`,
    provider: "system",
    name: friendlyName(voice),
    lang: voice.lang,
    natural: NATURAL.test(voice.name),
    offline: voice.localService,
  };
}

/**
 * The phone's own voices on Android. Their ids are codes ("en-us-x-iom-local"),
 * so each is named by its language and a number.
 */
export function fromAndroid(voices: AndroidVoice[], numbered: (n: number) => string): Voice[] {
  const counts = new Map<string, number>();
  return voices.map((voice) => {
    const n = (counts.get(voice.lang) ?? 0) + 1;
    counts.set(voice.lang, n);
    return {
      id: `android:${voice.id}`,
      provider: "android" as const,
      name: `${voice.language} · ${numbered(n)}`,
      lang: voice.lang,
      // Android's "high" and "very high" voices are its neural ones.
      natural: voice.quality >= 400,
      offline: !voice.network,
    };
  });
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
  natural: true,
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
    natural: true,
    offline: true,
    preferred: style.id === info.defaultStyle,
  }));
}

/**
 * Voices for a language, best first: natural before plain, an exact
 * regional match before others, voices that work offline before online.
 * The natural voice on the device beats even an exact "Enhanced" device
 * voice, and its default style beats its other styles.
 */
export function rankVoices(voices: Voice[], lang: string): Voice[] {
  const wanted = lang.toLowerCase();
  const base = languageOf(wanted);
  const score = (voice: Voice) =>
    (voice.natural ? 8 : 0) +
    (voice.lang.toLowerCase() === wanted ? 4 : 0) +
    (voice.lang === "*" ? 1 : 0) +
    (voice.offline ? 1 : 0) +
    (voice.provider === "device-neural" ? 2 : 0) +
    (voice.preferred ? 1 : 0);
  const seen = new Set<string>();
  return voices
    .filter((voice) => !seen.has(voice.id) && seen.add(voice.id))
    .filter((voice) => voice.lang === "*" || languageOf(voice.lang) === base)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}
