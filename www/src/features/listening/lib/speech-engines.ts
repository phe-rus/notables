import { androidSpeak, androidStopSpeaking } from "../../../platform/android-speech";
import { readAiKey } from "../../ai/store/ai-settings";
import { clampPace, synthesizeNatural } from "./natural-voice";
import { systemVoiceKey } from "./voices";

export interface SpeechOptions {
  rate: number;
  /** The language of the text being read. */
  lang: string;
}

/** Something that can say a piece of text out loud. */
export interface SpeechEngine {
  /** Resolves when finished; rejects with "cancelled" when stopped. */
  speak(text: string, options: SpeechOptions): Promise<void>;
  /** Gets ready to say this next, so there's no gap. */
  prepare?(text: string, options: SpeechOptions): void;
  cancel(): void;
}

const cancelled = () => new DOMException("Speech was stopped.", "AbortError");

/** The device's own voices, through the Web Speech API. */
export class SystemSpeech implements SpeechEngine {
  #current: SpeechSynthesisUtterance | null = null;

  constructor(private readonly voiceKey: string | null) {}

  async speak(text: string, { rate, lang }: SpeechOptions) {
    const voices = speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.volume = 1;
    const voice = voices.find((v) => systemVoiceKey(v) === this.voiceKey);
    if (voice) utterance.voice = voice;
    this.#current = utterance;
    await new Promise<void>((resolve, reject) => {
      utterance.onend = () => (this.#current === utterance ? resolve() : reject(cancelled()));
      utterance.onerror = (event) =>
        event.error === "interrupted" || event.error === "canceled"
          ? reject(cancelled())
          : reject(new Error(`Speech failed: ${event.error}`));
      speechSynthesis.speak(utterance);
    });
  }

  cancel() {
    this.#current = null;
    speechSynthesis.cancel();
  }
}

/** The phone's own voices on Android, through the app's bridge. */
export class AndroidSpeech implements SpeechEngine {
  constructor(private readonly voiceId: string) {}

  speak(text: string, { rate, lang }: SpeechOptions) {
    return androidSpeak(text, lang, this.voiceId, rate);
  }

  cancel() {
    androidStopSpeaking();
  }
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
let ttsModel: Promise<string> | null = null;

/** Finds a Gemini speech model this key can use. */
async function findTtsModel(apiKey: string): Promise<string> {
  const response = await fetch(`${GEMINI}/models?pageSize=200`, {
    headers: { "x-goog-api-key": apiKey },
  });
  if (!response.ok) throw new Error("Gemini didn’t accept this API key.");
  const body = (await response.json()) as { models?: Array<{ name: string }> };
  const names = (body.models ?? []).map((model) => model.name.replace(/^models\//, ""));
  const tts = names.filter((name) => /tts/i.test(name));
  // Prefer the faster "flash" voices; they sound the same for narration.
  const chosen = tts.find((name) => /flash/i.test(name)) ?? tts[0];
  if (!chosen) throw new Error("This Gemini key has no speech models.");
  return chosen;
}

function pcmToBuffer(context: AudioContext, base64: string, rate: number): AudioBuffer {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  const buffer = context.createBuffer(1, samples.length, rate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) channel[i] = (samples[i] ?? 0) / 32768;
  normalizePeak(channel);
  return buffer;
}

/**
 * Raises speech to full loudness, so the device's volume alone decides
 * how loud it is. Generated voices often arrive well below full scale.
 */
export function normalizePeak(channel: Float32Array, target = 0.98) {
  let peak = 0;
  for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  if (peak === 0 || peak >= target) return;
  const gain = target / peak;
  for (let i = 0; i < channel.length; i++) channel[i] = (channel[i] ?? 0) * gain;
}

/**
 * Plays generated speech through Web Audio, keeping a few rendered lines so
 * the next one is ready before the current one ends.
 */
class BufferedPlayback {
  #context: AudioContext | null = null;
  #source: AudioBufferSourceNode | null = null;
  #cache = new Map<string, Promise<AudioBuffer>>();
  #stop: (() => void) | null = null;

  get context(): AudioContext {
    this.#context ??= new AudioContext();
    return this.#context;
  }

  /** The rendered audio for `key`, rendering it once. */
  audio(key: string, render: () => Promise<AudioBuffer>): Promise<AudioBuffer> {
    let pending = this.#cache.get(key);
    if (!pending) {
      pending = render();
      this.#cache.set(key, pending);
      // A failed render is tried again next time.
      pending.catch(() => this.#cache.delete(key));
      // Keep only a few lines around.
      if (this.#cache.size > 6) this.#cache.delete(this.#cache.keys().next().value as string);
    }
    return pending;
  }

  async play(buffer: AudioBuffer, playbackRate = 1) {
    const context = this.context;
    if (context.state === "suspended") await context.resume();
    await new Promise<void>((resolve, reject) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.connect(context.destination);
      this.#source = source;
      this.#stop = () => reject(cancelled());
      source.onended = () => {
        if (this.#source === source) resolve();
      };
      source.start();
    });
  }

  cancel() {
    const source = this.#source;
    this.#source = null;
    try {
      source?.stop();
    } catch {
      // Already stopped.
    }
    this.#stop?.();
    this.#stop = null;
  }
}

/** Gemini's natural voices, using the person's own Gemini key. */
export class GeminiSpeech implements SpeechEngine {
  #playback = new BufferedPlayback();

  constructor(private readonly voiceName: string) {}

  #audio(text: string): Promise<AudioBuffer> {
    return this.#playback.audio(text, () => this.#fetch(text));
  }

  async #fetch(text: string): Promise<AudioBuffer> {
    const apiKey = await readAiKey("gemini");
    if (!apiKey) throw new Error("Add a Gemini key in Settings to use Gemini voices.");
    ttsModel ??= findTtsModel(apiKey).catch((error) => {
      ttsModel = null;
      throw error;
    });
    const model = await ttsModel;
    const response = await fetch(`${GEMINI}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } } },
        },
      }),
    });
    if (!response.ok) throw new Error(`Gemini couldn’t read this aloud (${response.status}).`);
    const body = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    };
    const inline = body.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData,
    )?.inlineData;
    if (!inline?.data) throw new Error("Gemini sent no audio.");
    const rate = Number(inline.mimeType?.match(/rate=(\d+)/)?.[1]) || 24_000;
    return pcmToBuffer(this.#playback.context, inline.data, rate);
  }

  prepare(text: string) {
    void this.#audio(text).catch(() => {});
  }

  async speak(text: string, { rate }: SpeechOptions) {
    await this.#playback.play(await this.#audio(text), rate);
  }

  cancel() {
    this.#playback.cancel();
  }
}

/**
 * The natural voice that runs on the device (spec 0001). It renders the
 * next line while the current one plays; pace changes the speaking speed
 * in the model, so the pitch stays the same.
 */
export class DeviceNeuralSpeech implements SpeechEngine {
  #playback = new BufferedPlayback();

  constructor(
    /** The pack version, fixed for the whole session. */
    private readonly version: string,
    private readonly sampleRate: number,
    private readonly style: string | null,
  ) {}

  #audio(text: string, { rate, lang }: SpeechOptions): Promise<AudioBuffer> {
    const speed = clampPace(rate);
    const key = [text, lang, this.style, speed, this.version].join("|");
    return this.#playback.audio(key, async () => {
      const samples = await synthesizeNatural({
        text,
        lang,
        version: this.version,
        style: this.style,
        speed,
      });
      const buffer = this.#playback.context.createBuffer(
        1,
        Math.max(1, samples.length),
        this.sampleRate,
      );
      const channel = buffer.getChannelData(0);
      channel.set(samples);
      normalizePeak(channel);
      return buffer;
    });
  }

  prepare(text: string, options: SpeechOptions) {
    void this.#audio(text, options).catch(() => {});
  }

  async speak(text: string, options: SpeechOptions) {
    await this.#playback.play(await this.#audio(text, options));
  }

  cancel() {
    this.#playback.cancel();
  }
}

/** Says why reading aloud can't start, in place of speaking. */
export class UnavailableSpeech implements SpeechEngine {
  constructor(private readonly reason: string) {}

  async speak(): Promise<void> {
    throw new Error(this.reason);
  }

  cancel() {}
}
