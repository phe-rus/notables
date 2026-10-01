import type { TranscriptSegment } from "@notables/core";
import { useCallback, useEffect, useRef, useState } from "react";

/** The parts of the Web Speech API we use (not in every TypeScript DOM lib). */
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/**
 * Recognisers report a phrase only when it ends, so estimate when it began
 * from its length (about 150 words a minute). Silences then show up as
 * gaps between segments, which become paragraph breaks.
 */
function speakingTime(text: string): number {
  return text.split(/\s+/).filter(Boolean).length * 400;
}

function recognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * Live speech-to-text while recording, timed against the recording clock.
 * Uses the platform recogniser where available (on-device on Apple
 * platforms); on-device Whisper in the native core will replace it.
 */
export function useLiveTranscription(elapsed: () => number, language = navigator.language) {
  const Recognition = useRef(recognitionConstructor()).current;
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interim, setInterim] = useState("");
  /** The recogniser exists but cannot run here (offline, permission, language). */
  const [failed, setFailed] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const listening = useRef(false);
  const lastSegmentEnd = useRef(0);

  const stop = useCallback(() => {
    listening.current = false;
    recognition.current?.stop();
    recognition.current = null;
    setInterim("");
  }, []);

  const start = useCallback(() => {
    if (!Recognition || failed || listening.current) return;
    const instance = new Recognition();
    instance.lang = language;
    instance.continuous = true;
    instance.interimResults = true;
    lastSegmentEnd.current = elapsed();

    instance.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0].transcript.trim();
        if (result.isFinal) {
          if (text) {
            const endMs = Math.round(elapsed());
            const startMs = Math.round(
              Math.max(lastSegmentEnd.current, endMs - speakingTime(text)),
            );
            setSegments((previous) => [...previous, { startMs, endMs, text }]);
            lastSegmentEnd.current = endMs;
          }
        } else {
          pending += `${text} `;
        }
      }
      setInterim(pending.trim());
    };
    // Recognisers stop after silences; keep listening until told to stop.
    instance.onend = () => {
      if (listening.current) instance.start();
    };
    // Silence and our own stop() are routine; anything else means it can't run here.
    instance.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setFailed(true);
      stop();
    };

    listening.current = true;
    recognition.current = instance;
    instance.start();
  }, [Recognition, elapsed, failed, language, stop]);

  useEffect(() => stop, [stop]);

  const reset = useCallback(() => {
    setSegments([]);
    setInterim("");
  }, []);

  return { supported: Recognition !== null && !failed, segments, interim, start, stop, reset };
}
