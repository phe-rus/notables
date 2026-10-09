import { androidBridge } from "./android-bridge";

/** A voice the phone's speech engine has installed (AndroidSpeech.kt). */
export interface AndroidVoice {
  id: string;
  /** BCP 47 tag, e.g. "en-GB". */
  lang: string;
  /** The language in the phone's own words, e.g. "English (United Kingdom)". */
  language: string;
  /** Android's scale: 400 is high, 500 very high. */
  quality: number;
  network: boolean;
}

type SpeechEvent = "ready" | "unavailable" | "done" | "error" | "stopped";

const pending = new Map<string, (event: SpeechEvent) => void>();
const readyWaiters = new Set<() => void>();
let nextId = 1;

function listen() {
  const target = window as unknown as {
    __notablesSpeech?: (id: string, event: SpeechEvent) => void;
  };
  target.__notablesSpeech ??= (id, event) => {
    if (event === "ready" || event === "unavailable") {
      for (const waiter of readyWaiters) waiter();
      readyWaiters.clear();
      return;
    }
    pending.get(id)?.(event);
    pending.delete(id);
  };
}

/** Whether this is the Android app, which has the phone's voices. */
export const androidSpeechAvailable = () => Boolean(androidBridge()?.speechVoices);

/** The phone's voices, waiting a moment for the engine to start the first time. */
export async function androidVoices(): Promise<AndroidVoice[]> {
  const bridge = androidBridge();
  if (!bridge?.speechVoices) return [];
  listen();
  let json = bridge.speechVoices();
  if (json === null) {
    await new Promise<void>((resolve) => {
      readyWaiters.add(resolve);
      setTimeout(resolve, 3000);
    });
    json = bridge.speechVoices();
  }
  try {
    return json ? (JSON.parse(json) as AndroidVoice[]) : [];
  } catch {
    return [];
  }
}

/** Says `text`; resolves when done, rejects when stopped or failed. */
export function androidSpeak(text: string, lang: string, voiceId: string, rate: number) {
  const bridge = androidBridge();
  if (!bridge?.speak) return Promise.reject(new Error("Speech isn’t available."));
  listen();
  const id = `notables-${nextId++}`;
  return new Promise<void>((resolve, reject) => {
    pending.set(id, (event) => {
      if (event === "done") resolve();
      else if (event === "stopped") reject(new DOMException("Speech was stopped.", "AbortError"));
      else reject(new Error("The phone couldn’t read this aloud."));
    });
    bridge.speak?.(id, text, lang, voiceId, rate);
  });
}

export function androidStopSpeaking() {
  androidBridge()?.stopSpeaking?.();
  // Anything still waiting was stopped.
  for (const [id, settle] of pending) {
    settle("stopped");
    pending.delete(id);
  }
}
