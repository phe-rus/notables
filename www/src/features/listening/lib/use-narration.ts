import { useCallback, useEffect, useRef, useState } from "react";
import { getAiSettings, readAiKey } from "../../ai/store/ai-settings";
import {
  getNarrationSettings,
  type NarrationSettings,
  useNarrationSettings,
} from "./narration-settings";
import { Narrator, type NarratorState } from "./narrator";
import { GeminiSpeech, type SpeechEngine, SystemSpeech } from "./speech-engines";
import {
  fromSystem,
  geminiVoices,
  rankVoices,
  speechSupported,
  systemVoices,
  type Voice,
} from "./voices";

/** Every voice that can read in `lang` here, best first. */
export async function availableVoices(lang: string): Promise<Voice[]> {
  const system = (await systemVoices()).map(fromSystem);
  const gemini = getAiSettings().enabled && (await readAiKey("gemini")) ? geminiVoices : [];
  return rankVoices([...system, ...gemini], lang);
}

async function engineFor(settings: NarrationSettings, lang: string): Promise<SpeechEngine> {
  const voices = await availableVoices(lang);
  const chosen = voices.find((voice) => voice.id === settings.voiceId) ?? voices[0];
  if (chosen?.provider === "gemini") return new GeminiSpeech(chosen.id.slice("gemini:".length));
  if (!speechSupported()) throw new Error("Reading aloud isn’t available on this device.");
  return new SystemSpeech(chosen ? chosen.id.slice("system:".length) : null);
}

/**
 * Reads lines aloud with the chosen voice, following voice and speed
 * changes, and answers the system's media controls.
 */
export function useNarration(lang: string, title: string) {
  const settings = useNarrationSettings();
  const narrator = useRef<Narrator | null>(null);
  const [state, setState] = useState<NarratorState | null>(null);

  const close = useCallback(() => {
    narrator.current?.stop();
    narrator.current = null;
    setState(null);
  }, []);

  const start = useCallback(
    async (lines: string[], from: number) => {
      close();
      const engine = await engineFor(getNarrationSettings(), lang);
      const next = new Narrator(lines, engine, { rate: getNarrationSettings().rate, lang }, from);
      next.subscribe(setState);
      narrator.current = next;
      setState(next.state);
      void next.play();
    },
    [close, lang],
  );

  // A new voice or pace takes over from the current line.
  useEffect(() => {
    const current = narrator.current;
    if (!current) return;
    let cancelled = false;
    void engineFor(settings, lang).then((engine) => {
      if (!cancelled && narrator.current === current) {
        current.reconfigure(engine, { rate: settings.rate, lang });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lang, settings]);

  useEffect(() => close, [close]);

  // Headphone buttons and lock-screen controls.
  const active = state !== null;
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({ title, artist: "Read aloud" });
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => void narrator.current?.play()],
      ["pause", () => narrator.current?.pause()],
      ["previoustrack", () => narrator.current?.seek(narrator.current.state.index - 1)],
      ["nexttrack", () => narrator.current?.seek(narrator.current.state.index + 1)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Not every system offers every control.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // As above.
        }
      }
    };
  }, [active, title]);

  return {
    state,
    start,
    close,
    toggle: () => narrator.current?.toggle(),
    seek: (index: number) => narrator.current?.seek(index),
  };
}
