import { useCallback, useEffect, useRef, useState } from "react";

const BARS = 48;

/** Deterministic pseudo-waveform so a clip looks the same on every device. */
function waveform(seed: string, peaks?: number[]): number[] {
  if (peaks?.length) return peaks;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Array.from({ length: BARS }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    return 0.25 + ((h >>> 0) % 1000) / 1333;
  });
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface AudioClipProps {
  src: string;
  durationMs: number;
  transcript: string;
  peaks?: number[];
}

/** Player shown inside the editor: play/pause, waveform scrubbing and transcript. */
export function AudioClip({ src, durationMs, transcript, peaks }: AudioClipProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const duration = durationMs / 1000;
  const bars = waveform(src, peaks);
  const progress = duration ? position / duration : 0;

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const tick = () => setPosition(el.currentTime);
    const stop = () => setPlaying(false);
    el.addEventListener("timeupdate", tick);
    el.addEventListener("ended", stop);
    el.addEventListener("pause", stop);
    return () => {
      el.removeEventListener("timeupdate", tick);
      el.removeEventListener("ended", stop);
      el.removeEventListener("pause", stop);
    };
  }, []);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
    }
  }, []);

  const seek = (event: React.MouseEvent<HTMLButtonElement>) => {
    const el = audio.current;
    if (!el || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    el.currentTime = ((event.clientX - rect.left) / rect.width) * duration;
  };

  return (
    <div className="nt-audio" contentEditable={false}>
      {/* biome-ignore lint/a11y/useMediaCaption: the transcript below is the caption */}
      <audio ref={audio} src={src} preload="metadata" />
      <div className="nt-audio-row">
        <button
          type="button"
          className="nt-audio-play"
          aria-label={playing ? "Pause recording" : "Play recording"}
          onClick={toggle}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4l14 8-14 8z" />
            </svg>
          )}
        </button>
        <button type="button" className="nt-audio-wave" aria-label="Seek" onClick={seek}>
          {bars.map((height, i) => (
            <span
              key={i}
              data-played={i / bars.length < progress || undefined}
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          ))}
        </button>
        <span className="nt-audio-time">
          {clock(position)} / {clock(duration)}
        </span>
      </div>
      {transcript && (
        <p className="nt-audio-transcript">
          <b>Transcript</b> · “{transcript}”
        </p>
      )}
    </div>
  );
}
