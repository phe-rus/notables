import { useCallback, useEffect, useRef, useState } from "react";
import { type MessageKey, t } from "../../../i18n/i18n";
import { androidSpeechAvailable, androidVoices } from "../../../platform/android-speech";
import { getAiSettings, readAiKey } from "../../ai/store/ai-settings";
import {
  getNarrationSettings,
  type NarrationSettings,
  useNarrationSettings,
} from "./narration-settings";
import { Narrator, type NarratorState } from "./narrator";
import {
  type NaturalVoiceInfo,
  NaturalVoiceMissing,
  naturalVoiceInfo,
  warmNaturalVoice,
} from "./natural-voice";
import {
  AndroidSpeech,
  DeviceNeuralSpeech,
  GeminiSpeech,
  type SpeechEngine,
  SystemSpeech,
  UnavailableSpeech,
} from "./speech-engines";
import {
  fromAndroid,
  fromSystem,
  geminiVoices,
  naturalVoices,
  rankVoices,
  speechSupported,
  systemVoices,
  type Voice,
} from "./voices";

/** A natural voice style's descriptor; its name is never translated. */
export function describeStyle(styleId: string): string {
  const key = `listening.voiceStyles.${styleId}` as MessageKey;
  const text = t(key);
  return text === key ? t("listening.naturalVoice") : text;
}

/** Every voice that can read in `lang` here, best first. */
export async function availableVoices(
  lang: string,
  natural?: NaturalVoiceInfo | null,
): Promise<Voice[]> {
  const [system, android, info] = await Promise.all([
    systemVoices(),
    androidVoices(),
    natural === undefined ? naturalVoiceInfo() : natural,
  ]);
  const gemini = getAiSettings().enabled && (await readAiKey("gemini")) ? geminiVoices : [];
  return rankVoices(
    [
      ...naturalVoices(info, lang, describeStyle),
      ...system.map(fromSystem),
      ...fromAndroid(android, (count) => t("listening.voiceNumber", { count })),
      ...gemini,
    ],
    lang,
  );
}

/**
 * The engine for the chosen voice, else the best one for `lang`. A session
 * keeps the natural voice version it started with (`pinned`), so an update
 * that lands mid book never changes the voice under the reader.
 */
async function engineFor(
  settings: NarrationSettings,
  lang: string,
  pinned: NaturalVoiceInfo | null,
): Promise<SpeechEngine> {
  const voices = await availableVoices(lang, pinned ?? undefined);
  const chosen = voices.find((voice) => voice.id === settings.voiceId) ?? voices[0];
  if (!chosen) return new UnavailableSpeech(t("listening.noVoiceForLanguage"));
  if (chosen.provider === "gemini") return new GeminiSpeech(chosen.id.slice("gemini:".length));
  if (chosen.provider === "device-neural") {
    const info = pinned ?? (await naturalVoiceInfo());
    if (info) {
      const style = chosen.id.slice("device-neural:".length);
      return new DeviceNeuralSpeech(info.version, info.sampleRate ?? 44_100, style);
    }
  }
  if (chosen.provider === "android") return new AndroidSpeech(chosen.id.slice("android:".length));
  if (!speechSupported() && !androidSpeechAvailable()) {
    return new UnavailableSpeech(t("common.notAvailable"));
  }
  return new SystemSpeech(chosen.provider === "system" ? chosen.id.slice("system:".length) : null);
}

/**
 * Reads lines aloud with the chosen voice, following voice and speed
 * changes, and answers the system's media controls.
 */
export function useNarration(lang: string, title: string) {
  const settings = useNarrationSettings();
  const narrator = useRef<Narrator | null>(null);
  /** The natural voice version this session started with. */
  const pinned = useRef<NaturalVoiceInfo | null>(null);
  const [state, setState] = useState<NarratorState | null>(null);

  useEffect(warmNaturalVoice, []);

  const close = useCallback(() => {
    narrator.current?.stop();
    narrator.current = null;
    setState(null);
  }, []);

  const start = useCallback(
    async (lines: string[], from: number) => {
      close();
      pinned.current = await naturalVoiceInfo();
      const engine = await engineFor(getNarrationSettings(), lang, pinned.current);
      const next = new Narrator(lines, engine, { rate: getNarrationSettings().rate, lang }, from);
      // The natural voice was deleted mid session: carry on with a device voice.
      next.recover = async (error) => {
        if (!(error instanceof NaturalVoiceMissing)) return null;
        pinned.current = null;
        return engineFor(getNarrationSettings(), lang, null);
      };
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
    void engineFor(settings, lang, pinned.current).then((engine) => {
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
