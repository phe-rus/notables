import { useCallback, useEffect, useRef, useState } from "react";
import { type MicrophoneProblem, microphoneProblem } from "../lib/microphone-help";

export type RecorderState =
  | "idle"
  | "starting"
  | "recording"
  | "paused"
  | "unavailable"
  | "unsupported";

export interface Recording {
  blob: Blob;
  durationMs: number;
}

/** Number of recent input levels kept for the live waveform. */
const LEVEL_HISTORY = 40;
// MP4 first: it plays everywhere and is an EPUB core media type; WebM is the fallback.
const PREFERRED_TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Records from the microphone with pause/resume, an elapsed-time clock that
 * excludes pauses, and live input levels for a waveform.
 */
export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  /** Why recording couldn't start, when state is "unavailable". */
  const [problem, setProblem] = useState<MicrophoneProblem | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_HISTORY).fill(0));

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const chunks = useRef<Blob[]>([]);
  const clock = useRef({ accumulated: 0, since: 0 });
  const frame = useRef<number | null>(null);

  const elapsed = useCallback(() => {
    const { accumulated, since } = clock.current;
    return accumulated + (since ? performance.now() - since : 0);
  }, []);

  const release = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
    void audioContext.current?.close();
    audioContext.current = null;
    recorder.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("unsupported");
      return;
    }
    setState("starting");
    try {
      const input = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      stream.current = input;

      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(input).connect(analyser);
      audioContext.current = context;
      const samples = new Float32Array(analyser.fftSize);
      let lastSample = 0;
      const sample = (time: number) => {
        frame.current = requestAnimationFrame(sample);
        if (time - lastSample < 60) return;
        lastSample = time;
        setElapsedMs(elapsed());
        if (recorder.current?.state !== "recording") return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) sum += value * value;
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 4);
        setLevels((previous) => [...previous.slice(1), level]);
      };
      frame.current = requestAnimationFrame(sample);

      const mimeType = pickMimeType();
      const media = new MediaRecorder(input, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      media.start(1000);
      recorder.current = media;
      clock.current = { accumulated: 0, since: performance.now() };
      setState("recording");
    } catch (error) {
      release();
      setProblem(microphoneProblem(error));
      setState("unavailable");
    }
  }, [elapsed, release]);

  const pause = useCallback(() => {
    if (recorder.current?.state !== "recording") return;
    recorder.current.pause();
    clock.current = { accumulated: elapsed(), since: 0 };
    setState("paused");
  }, [elapsed]);

  const resume = useCallback(() => {
    if (recorder.current?.state !== "paused") return;
    recorder.current.resume();
    clock.current = { ...clock.current, since: performance.now() };
    setState("recording");
  }, []);

  /** Stops and returns the recording, or null if nothing was captured. */
  const stop = useCallback((): Promise<Recording | null> => {
    const media = recorder.current;
    if (!media) return Promise.resolve(null);
    const durationMs = Math.round(elapsed());
    return new Promise((resolve) => {
      media.onstop = () => {
        const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
        release();
        setState("idle");
        resolve(blob.size > 0 ? { blob, durationMs } : null);
      };
      media.stop();
    });
  }, [elapsed, release]);

  const cancel = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    chunks.current = [];
    release();
    setState("idle");
    setElapsedMs(0);
  }, [release]);

  return { state, problem, elapsedMs, levels, elapsed, start, pause, resume, stop, cancel };
}
