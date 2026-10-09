import type { TranscriptSegment } from "@notables/core";
import { cn, confirmDialog, PauseIcon, PlayIcon, spring } from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { devicePlatform } from "../../../platform/device-platform";
import { openMicrophoneSettings } from "../../../platform/system-settings";
import { useAudioRecorder } from "../hooks/use-audio-recorder";
import { useLiveTranscription } from "../hooks/use-live-transcription";
import { formatDuration } from "../lib/format-duration";
import { type MicrophoneProblem, microphoneHelp } from "../lib/microphone-help";
import { LevelMeter } from "./level-meter";

export interface FinishedRecording {
  blob: Blob;
  durationMs: number;
  segments: TranscriptSegment[];
}

export interface RecorderSheetProps {
  open: boolean;
  title: string;
  onCancel: () => void;
  onFinish: (recording: FinishedRecording) => void | Promise<void>;
}

const subscribeNoop = () => () => {};

/**
 * Full-screen recorder: waveform, clock, live transcript, pause and finish.
 * Rendered in a portal so it covers the screen wherever it is opened from
 * (glass bars use backdrop filters, which would otherwise contain it).
 */
export function RecorderSheet({ open, ...props }: RecorderSheetProps) {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center bg-black/40 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            // Always dark, like a recording studio, whatever the app's appearance.
            data-theme="dark"
            role="dialog"
            aria-modal="true"
            aria-label="Record audio"
            className="flex h-full w-full max-w-[520px] flex-col overflow-hidden bg-background text-label md:h-[760px] md:max-h-full md:rounded-[32px] md:shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring.smooth}
          >
            <RecorderSession {...props} />
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function RecorderSession({ title, onCancel, onFinish }: Omit<RecorderSheetProps, "open">) {
  const recorder = useAudioRecorder();
  const transcription = useLiveTranscription(recorder.elapsed);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const { start: startRecording } = recorder;
  const { start: startTranscription, stop: stopTranscription } = transcription;

  useEffect(() => {
    void startRecording();
  }, [startRecording]);

  useEffect(() => {
    if (recorder.state === "recording") startTranscription();
    else stopTranscription();
  }, [recorder.state, startTranscription, stopTranscription]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [transcription.segments.length, transcription.interim]);

  const cancel = async () => {
    if (
      recorder.elapsedMs > 3000 &&
      !(await confirmDialog({
        title: "Discard this recording?",
        message: "What you recorded won’t be saved.",
        confirmLabel: "Discard",
        cancelLabel: "Keep recording",
        destructive: true,
      }))
    ) {
      return;
    }
    recorder.cancel();
    onCancel();
  };

  const finish = async () => {
    stopTranscription();
    const recording = await recorder.stop();
    if (recording) await onFinish({ ...recording, segments: transcription.segments });
    else onCancel();
  };

  const recording = recorder.state === "recording";
  const live = recording || recorder.state === "paused";
  const status = statusLine(recorder.state, transcription.supported);

  return (
    <>
      <header className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" onClick={cancel} className="min-h-11 px-2 text-body text-accent-text">
          Cancel
        </button>
        <h2 className="truncate px-2 text-body font-semibold">{title}</h2>
        <span className="w-[68px]" aria-hidden="true" />
      </header>

      <div className="flex flex-col items-center gap-1.5 pt-7 pb-3">
        <span className="text-[54px] font-light tracking-[0.02em] tabular-nums" aria-live="off">
          {formatDuration(recorder.elapsedMs)}
        </span>
        <span
          className="flex items-center gap-1.5 text-footnote text-label-secondary"
          aria-live="polite"
        >
          {live && (
            <span
              className={cn(
                "size-2 rounded-full",
                recording ? "animate-pulse bg-danger" : "bg-label-secondary",
              )}
            />
          )}
          {status}
        </span>
      </div>

      <LevelMeter levels={recorder.levels} active={recording} className="px-5" />

      <div className="mx-4 mt-5 flex min-h-0 grow flex-col gap-3.5 overflow-y-auto rounded-5xl bg-elevated p-5">
        {recorder.state === "unavailable" && recorder.problem && (
          <MicrophoneHelpCard problem={recorder.problem} onRetry={recorder.start} />
        )}
        <span className="text-caption font-semibold tracking-[0.04em] text-label-tertiary">
          LIVE TRANSCRIPT
        </span>
        {transcription.segments.map((segment) => (
          <div key={`${segment.startMs}-${segment.text}`} className="flex gap-3">
            <span className="w-11 shrink-0 pt-1 text-caption text-label-tertiary tabular-nums">
              {formatDuration(segment.startMs)}
            </span>
            <p className="font-serif text-body leading-relaxed text-ink">{segment.text}</p>
          </div>
        ))}
        {transcription.interim && (
          <p className="pl-14 font-serif text-body leading-relaxed text-label-tertiary">
            {transcription.interim}…
          </p>
        )}
        {!transcription.supported && (
          <p className="text-subheadline leading-snug text-label-tertiary">
            Live transcription isn’t available on this device yet. Your recording is still saved
            with the note.
          </p>
        )}
        <div ref={transcriptEnd} />
      </div>

      <footer className="flex items-center justify-between px-7 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          aria-label={recording ? "Pause" : "Resume"}
          disabled={!live}
          onClick={recording ? recorder.pause : recorder.resume}
          className="flex size-14 items-center justify-center rounded-full bg-fill transition-transform active:scale-95 disabled:opacity-40"
        >
          {recording ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>
        <button
          type="button"
          aria-label="Stop and add to note"
          disabled={!live}
          onClick={finish}
          className="flex size-[78px] items-center justify-center rounded-full border-4 border-label transition-transform active:scale-95 disabled:opacity-40"
        >
          <span className="size-[30px] rounded-md bg-danger" />
        </button>
        {/* Balances the pause button so the stop control stays centred. */}
        <span className="size-14" aria-hidden="true" />
      </footer>
    </>
  );
}

function statusLine(
  state: ReturnType<typeof useAudioRecorder>["state"],
  transcribing: boolean,
): string {
  switch (state) {
    case "starting":
      return "Waiting for the microphone…";
    case "recording":
      return transcribing ? "Recording · transcribing live" : "Recording";
    case "paused":
      return "Paused";
    case "unavailable":
      return "Microphone unavailable";
    case "unsupported":
      return "Recording isn’t supported on this device.";
    default:
      return "";
  }
}

function MicrophoneHelpCard({
  problem,
  onRetry,
}: {
  problem: MicrophoneProblem;
  onRetry: () => void;
}) {
  const help = microphoneHelp(problem, devicePlatform());
  const [opened, setOpened] = useState(false);
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-3xl bg-fill p-4">
      <p className="text-subheadline font-semibold text-label">{help.title}</p>
      <p className="text-subheadline leading-snug text-label-secondary">{help.steps}</p>
      <div className="flex flex-wrap gap-2">
        {help.canOpenSettings && (
          <button
            type="button"
            onClick={async () => setOpened(await openMicrophoneSettings())}
            className="rounded-full bg-inverse px-4 py-2 text-subheadline font-semibold text-on-inverse transition-transform active:scale-[0.97]"
          >
            {opened ? "Settings opened" : "Open Settings"}
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-separator px-4 py-2 text-subheadline font-semibold text-label transition-transform active:scale-[0.97]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
