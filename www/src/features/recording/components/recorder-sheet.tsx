import type { TranscriptSegment } from "@notables/core";
import { cn, confirmDialog, PauseIcon, PlayIcon, spring } from "@notables/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useAudioRecorder } from "../hooks/use-audio-recorder";
import { useLiveTranscription } from "../hooks/use-live-transcription";
import { formatDuration } from "../lib/format-duration";
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
            role="dialog"
            aria-modal="true"
            aria-label="Record audio"
            className="flex h-full w-full max-w-[520px] flex-col overflow-hidden bg-[#121110] text-[#f5f2ec] md:h-[760px] md:max-h-full md:rounded-[32px] md:shadow-2xl"
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
        <button type="button" onClick={cancel} className="min-h-11 px-2 text-[17px] text-[#ffc53d]">
          Cancel
        </button>
        <h2 className="truncate px-2 text-[17px] font-semibold">{title}</h2>
        <span className="w-[68px]" aria-hidden="true" />
      </header>

      <div className="flex flex-col items-center gap-1.5 pt-7 pb-3">
        <span className="text-[54px] font-light tracking-[0.02em] tabular-nums" aria-live="off">
          {formatDuration(recorder.elapsedMs)}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-[#b5aea2]" aria-live="polite">
          {live && (
            <span
              className={cn(
                "size-2 rounded-full",
                recording ? "animate-pulse bg-[#ff453a]" : "bg-[#b5aea2]",
              )}
            />
          )}
          {status}
        </span>
      </div>

      <LevelMeter levels={recorder.levels} active={recording} className="px-5" />

      <div className="mx-4 mt-5 flex min-h-0 grow flex-col gap-3.5 overflow-y-auto rounded-[22px] bg-[#1f1d1a] p-5">
        <span className="text-[12px] font-semibold tracking-[0.04em] text-[#8f887b]">
          LIVE TRANSCRIPT
        </span>
        {transcription.segments.map((segment) => (
          <div key={`${segment.startMs}-${segment.text}`} className="flex gap-3">
            <span className="w-11 shrink-0 pt-1 text-[12px] text-[#8f887b] tabular-nums">
              {formatDuration(segment.startMs)}
            </span>
            <p className="font-serif text-[17px] leading-relaxed text-[#ece6da]">{segment.text}</p>
          </div>
        ))}
        {transcription.interim && (
          <p className="pl-14 font-serif text-[17px] leading-relaxed text-[#8f887b]">
            {transcription.interim}…
          </p>
        )}
        {!transcription.supported && (
          <p className="text-[14px] leading-snug text-[#8f887b]">
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
          className="flex size-14 items-center justify-center rounded-full bg-[#2c2a26] transition-transform active:scale-95 disabled:opacity-40"
        >
          {recording ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>
        <button
          type="button"
          aria-label="Stop and add to note"
          disabled={!live}
          onClick={finish}
          className="flex size-[78px] items-center justify-center rounded-full border-4 border-[#f5f2ec] transition-transform active:scale-95 disabled:opacity-40"
        >
          <span className="size-[30px] rounded-[8px] bg-[#ff453a]" />
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
    case "denied":
      return "Microphone access was declined. Allow it in Settings to record.";
    case "unsupported":
      return "Recording isn’t supported on this device.";
    default:
      return "";
  }
}
