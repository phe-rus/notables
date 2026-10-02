/**
 * Voices for reading aloud: the device's own, best-sounding first, and
 * Gemini's when the person has set up a Gemini key.
 */

export type VoiceProvider = "system" | "gemini";

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

export function fromSystem(voice: SpeechSynthesisVoice): Voice {
  return {
    id: `system:${voice.voiceURI}`,
    provider: "system",
    name: friendlyName(voice),
    lang: voice.lang,
    natural: NATURAL.test(voice.name),
    offline: voice.localService,
  };
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
 * Voices for a language, best first: natural before plain, an exact
 * regional match before others, voices that work offline before online.
 */
export function rankVoices(voices: Voice[], lang: string): Voice[] {
  const wanted = lang.toLowerCase();
  const base = languageOf(wanted);
  const score = (voice: Voice) =>
    (voice.natural ? 8 : 0) +
    (voice.lang.toLowerCase() === wanted ? 4 : 0) +
    (voice.lang === "*" ? 1 : 0) +
    (voice.offline ? 1 : 0);
  return voices
    .filter((voice) => voice.lang === "*" || languageOf(voice.lang) === base)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}
