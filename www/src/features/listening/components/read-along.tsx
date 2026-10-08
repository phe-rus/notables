import { Button, cn, toast } from "@ultrapeach/ui";
import { useEffect, useRef, useState } from "react";
import { t } from "../../../i18n/i18n";
import { canTranscribeRecordings, transcribeRecording } from "../lib/transcribe-recording";
import { phraseAt, useTimedTranscript } from "../store/transcript-store";

/**
 * The words of the chapter, lit up as they're spoken. Tap a line to jump
 * there. Recordings without a timed transcript can be transcribed on the
 * device, and the words appear as they're found.
 */
export function ReadAlong({
  src,
  plainTranscript,
  time,
  playing,
  onSeek,
}: {
  src: string;
  /** A transcript without timings, shown when there's no timed one. */
  plainTranscript: string;
  time: number;
  playing: boolean;
  onSeek: (seconds: number) => void;
}) {
  const transcript = useTimedTranscript(src);
  const [progress, setProgress] = useState<{ fraction: number | null; status: string } | null>(
    null,
  );
  const list = useRef<HTMLOListElement>(null);
  const phrases = transcript?.phrases ?? [];
  const current = phraseAt(phrases, time * 1000);

  // Keep the spoken line in view while playing.
  useEffect(() => {
    if (!playing || current < 0) return;
    const element = list.current?.children[current] as HTMLElement | undefined;
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current, playing]);

  const transcribe = async () => {
    setProgress({ fraction: 0, status: "Getting ready…" });
    try {
      await transcribeRecording(src, (fraction, status) => setProgress({ fraction, status }));
      toast.success(t("listening.transcriptReady"), {
        description: t("listening.transcriptReadyBody"),
      });
    } catch (error) {
      toast.error(t("listening.couldNotTranscribe"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setProgress(null);
    }
  };

  const working = progress !== null || (transcript && !transcript.complete);

  return (
    <div className="flex flex-col gap-3">
      {working && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-fill/50 px-3.5 py-3">
          <div className="flex justify-between text-footnote text-label-secondary">
            <span>{progress?.status ?? t("listening.transcribing")}</span>
            {progress?.fraction != null && (
              <span className="tabular-nums">{Math.round(progress.fraction * 100)}%</span>
            )}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-fill">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${Math.round((progress?.fraction ?? 0) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {phrases.length > 0 ? (
        <ol ref={list} className="flex flex-col gap-0.5" aria-label={t("listening.transcript")}>
          {phrases.map(([start, , text], index) => (
            <li key={`${start}-${index}`}>
              <button
                type="button"
                onClick={() => onSeek(start / 1000)}
                aria-current={index === current ? "true" : undefined}
                className={cn(
                  "w-full rounded-lg px-3 py-1.5 text-left font-serif text-body leading-relaxed transition-colors duration-300",
                  index === current
                    ? "bg-accent/12 text-label"
                    : index < current
                      ? "text-label-secondary hover:bg-fill/50"
                      : "text-label-tertiary hover:bg-fill/50",
                )}
              >
                {text}
              </button>
            </li>
          ))}
        </ol>
      ) : plainTranscript ? (
        <p className="px-3 font-serif text-callout leading-relaxed whitespace-pre-line text-label">
          {plainTranscript}
        </p>
      ) : null}

      {!working && !transcript?.complete && (
        <div className="flex flex-col items-start gap-2 px-3">
          <p className="text-[14px] text-label-secondary">
            {canTranscribeRecordings()
              ? t("listening.readAlongHint")
              : t("listening.readAlongWebHint")}
          </p>
          {canTranscribeRecordings() && (
            <Button variant="secondary" onClick={() => void transcribe()}>
              {t("listening.transcribe")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
