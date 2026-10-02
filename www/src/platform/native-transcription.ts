import { localMediaId } from "@notables/core";
import type { TranscriptionService } from "@notables/editor";
import { confirmDialog, toast } from "@notables/ui";
import { Channel, invoke } from "@tauri-apps/api/core";
import { decodeForSpeech } from "../features/recording/lib/decode-audio";
import { isTauri } from "./runtime";
import { loadMedia } from "./storage/media-store";

interface ModelStatus {
  downloaded: boolean;
  sizeBytes: number | null;
}

interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number | null;
}

interface SpeechSegment {
  startMs: number;
  endMs: number;
  text: string;
}

async function recordingBlob(src: string): Promise<Blob> {
  const mediaId = localMediaId(src);
  const blob = mediaId ? await loadMedia(mediaId) : await (await fetch(src)).blob();
  if (!blob) throw new Error("This recording isn’t on this device.");
  return blob;
}

async function ensureModel(onProgress: (status: string) => void): Promise<void> {
  const status = await invoke<ModelStatus>("whisper_model_status");
  if (status.downloaded) return;
  const consent = await confirmDialog({
    title: "Transcribe on this device?",
    message:
      "Notables downloads the speech model once (about 140 MB). Your recordings never leave this device.",
    confirmLabel: "Download",
  });
  if (!consent) throw new Error("Transcription needs the speech model.");

  const toastId = toast.loading("Downloading the speech model…");
  const progress = new Channel<DownloadProgress>();
  progress.onmessage = ({ receivedBytes, totalBytes }) => {
    const percent = totalBytes ? Math.round((receivedBytes / totalBytes) * 100) : null;
    const label = percent === null ? "Downloading model…" : `Downloading model… ${percent}%`;
    onProgress(label);
    toast.update(toastId, "loading", "Downloading the speech model…", {
      description: percent === null ? undefined : `${percent}%`,
    });
  };
  try {
    await invoke("whisper_download_model", { onProgress: progress });
    toast.update(toastId, "success", "Speech model ready", {
      description: "Transcription now works offline.",
    });
  } catch (error) {
    toast.update(toastId, "error", "Couldn’t download the speech model", {
      description: "Check your connection and try again.",
    });
    throw error;
  }
}

/** On-device Whisper in the native apps; null where it isn't available. */
export function createNativeTranscription(): TranscriptionService | null {
  if (!isTauri()) return null;
  return {
    async transcribe(src, onProgress) {
      const blob = await recordingBlob(src);
      await ensureModel(onProgress);
      onProgress("Transcribing…");
      const samples = await decodeForSpeech(blob);
      const segments = await invoke<SpeechSegment[]>(
        "whisper_transcribe",
        new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength),
      );
      const text = segments
        .map((segment) => segment.text)
        .join(" ")
        .trim();
      if (!text) throw new Error("No speech was found in this recording.");
      return text;
    },
  };
}
