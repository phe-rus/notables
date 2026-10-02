import { localMediaId } from "@notables/core";
import { Channel, invoke } from "@tauri-apps/api/core";
import { ensureModel } from "../../../platform/native-transcription";
import { isTauri } from "../../../platform/runtime";
import { LANGUAGE_KEY } from "../../setup/lib/setup-state";
import { getTranscriptStore, type TimedPhrase } from "../store/transcript-store";

interface Segment {
  startMs: number;
  endMs: number;
  text: string;
}

interface Progress {
  doneMs: number;
  totalMs: number | null;
  segments: Segment[];
}

/** Long recordings are transcribed by the native app, from the file itself. */
export const canTranscribeRecordings = () => isTauri();

/**
 * Transcribes a stored recording with on-device Whisper, saving phrases as
 * they're found so read-along works while it's still going. `onProgress`
 * gets a fraction from 0 to 1 when the length is known.
 */
export async function transcribeRecording(
  src: string,
  onProgress: (fraction: number | null, status: string) => void,
): Promise<void> {
  const mediaId = localMediaId(src);
  if (!isTauri() || !mediaId) {
    throw new Error("Transcribing audiobooks works in the Notables app on your computer or phone.");
  }
  await ensureModel((status) => onProgress(null, status));
  const store = getTranscriptStore();
  const phrases: TimedPhrase[] = [];
  const channel = new Channel<Progress>();
  channel.onmessage = ({ doneMs, totalMs, segments }) => {
    phrases.push(...segments.map((s): TimedPhrase => [s.startMs, s.endMs, s.text]));
    store.set(src, { phrases: [...phrases], complete: false, updatedAt: Date.now() });
    onProgress(totalMs ? Math.min(1, doneMs / totalMs) : null, "Transcribing…");
  };
  onProgress(0, "Transcribing…");
  let language: string | null = null;
  try {
    language = localStorage.getItem(LANGUAGE_KEY);
  } catch {
    // Detect it instead.
  }
  const segments = await invoke<Segment[]>("whisper_transcribe_media", {
    mediaId,
    language: language && language !== "auto" ? language.slice(0, 2) : null,
    onProgress: channel,
  });
  store.set(src, {
    phrases: segments.map((s): TimedPhrase => [s.startMs, s.endMs, s.text]),
    complete: true,
    updatedAt: Date.now(),
  });
}
