import { useMediaSource } from "@notables/editor";
import {
  CloseIcon,
  cn,
  NextTrackIcon,
  PauseIcon,
  PlayIcon,
  PreviousTrackIcon,
  SegmentedControl,
  SkipBackIcon,
  SkipForwardIcon,
  SleepIcon,
  spring,
} from "@notables/ui";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ReadAlong } from "../../../listening/components/read-along";
import { useAudiobookSession } from "../../../listening/store/listening-store";
import { BookCover } from "../../components/book-cover";
import type { BookEntry } from "../../store/book-store";
import { type AudiobookPlayback, type SleepTimer, SPEEDS } from "./use-audiobook";

const SLEEP_CHOICES: SleepTimer[] = [null, 15, 30, 60, "chapter"];

/** 75 → "1:15", 3725 → "1:02:05". */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

function sleepLabel(sleep: SleepTimer, sleepAt: number | null, now: number): string {
  if (sleep === null) return "Sleep";
  if (sleep === "chapter") return "End of chapter";
  return sleepAt ? `${Math.max(1, Math.ceil((sleepAt - now) / 60_000))} min` : `${sleep} min`;
}

/**
 * Listening to an audiobook: chapter after chapter, with the cover, the
 * chapter list, speed and a sleep timer. The cover tints the backdrop.
 */
export function AudiobookPlayer({ book }: { book: BookEntry }) {
  // Playback lives app-wide, so it carries on after this screen closes.
  const player = useAudiobookSession(book.id);
  if (!player) return <div className="fixed inset-0 bg-surface" />;
  return <PlayerScreen book={book} player={player} />;
}

function PlayerScreen({ book, player }: { book: BookEntry; player: AudiobookPlayback }) {
  const cover = useMediaSource(book.cover ?? "");
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState<"chapters" | "words">("chapters");

  useEffect(() => {
    if (!player.sleepAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [player.sleepAt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement && event.target.type !== "range") return;
      if (event.key === " ") player.toggle();
      else if (event.key === "ArrowLeft") player.skip(-15);
      else if (event.key === "ArrowRight") player.skip(30);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player.toggle, player.skip]);

  const { track, time, duration } = player;
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(player.speed as never) + 1) % SPEEDS.length] ?? 1;
  const nextSleep = SLEEP_CHOICES[(SLEEP_CHOICES.indexOf(player.sleep) + 1) % SLEEP_CHOICES.length];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-surface text-label">
      {/* The cover, blurred, colours the whole player. */}
      {cover && book.cover && (
        <img
          src={cover}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-35 blur-3xl saturate-150"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/70 to-surface" />

      <header className="relative flex h-14 shrink-0 items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
        <Link
          to="/books/$bookId"
          params={{ bookId: book.id }}
          aria-label="Close player"
          className="flex size-[34px] items-center justify-center rounded-full transition-colors hover:bg-fill"
        >
          <CloseIcon size={20} />
        </Link>
        <p className="truncate text-[13px] font-medium text-label-secondary">
          {player.tracks.length > 0 && `Chapter ${player.index + 1} of ${player.tracks.length}`}
        </p>
        <span className="w-[34px]" />
      </header>

      <div className="relative flex min-h-0 grow flex-col items-center gap-8 overflow-y-auto px-6 pb-[max(24px,env(safe-area-inset-bottom))] lg:flex-row lg:items-stretch lg:justify-center lg:gap-14">
        <section
          aria-label="Now playing"
          className="flex w-full max-w-[420px] shrink-0 flex-col items-center gap-6 pt-4 lg:justify-center"
        >
          <motion.div
            animate={{ scale: player.playing ? 1 : 0.9 }}
            transition={spring.smooth}
            className="w-[min(72vw,300px)]"
          >
            <BookCover
              title={book.title}
              author={book.author}
              image={book.cover}
              className="w-full rounded-[10px] shadow-[0_30px_70px_-24px_rgb(0_0_0/0.55)]"
            />
          </motion.div>

          <div className="flex w-full flex-col items-center gap-1 text-center">
            <h1 className="line-clamp-2 text-[22px] leading-tight font-bold tracking-tight">
              {track?.title ?? book.title}
            </h1>
            <p className="text-[15px] text-label-secondary">
              {[book.title, book.author].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <label className="sr-only" htmlFor="listen-progress">
              Position in chapter
            </label>
            <input
              id="listen-progress"
              type="range"
              min={0}
              max={Math.max(1, duration)}
              step={1}
              value={Math.min(time, duration || time)}
              onChange={(event) => player.seek(Number(event.target.value))}
              className="book-scrubber w-full"
            />
            <div className="flex justify-between text-[12px] text-label-tertiary tabular-nums">
              <span>{clock(time)}</span>
              <span>−{clock(Math.ceil(Math.max(0, duration - time)))}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <TransportButton
              label="Previous chapter"
              disabled={player.index <= 0}
              onClick={() => player.playTrack(player.index - 1)}
            >
              <PreviousTrackIcon size={24} />
            </TransportButton>
            <TransportButton label="Back 15 seconds" onClick={() => player.skip(-15)}>
              <SkipBackIcon size={28} />
            </TransportButton>
            <motion.button
              type="button"
              aria-label={player.playing ? "Pause" : "Play"}
              disabled={!track}
              onClick={player.toggle}
              whileTap={{ scale: 0.92 }}
              className="flex size-[72px] items-center justify-center rounded-full bg-inverse text-on-inverse shadow-[0_12px_30px_-12px_rgb(0_0_0/0.5)] disabled:opacity-40"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={player.playing ? "pause" : "play"}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={spring.snappy}
                  className={cn(!player.playing && "translate-x-[2px]")}
                >
                  {player.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <TransportButton label="Forward 30 seconds" onClick={() => player.skip(30)}>
              <SkipForwardIcon size={28} />
            </TransportButton>
            <TransportButton
              label="Next chapter"
              disabled={player.index + 1 >= player.tracks.length}
              onClick={() => player.playTrack(player.index + 1)}
            >
              <NextTrackIcon size={24} />
            </TransportButton>
          </div>

          <div className="flex items-center gap-2">
            <Pill label={`Speed ${nextSpeed}×`} onClick={() => player.setSpeed(nextSpeed)}>
              {player.speed}×
            </Pill>
            <Pill
              label={nextSleep === null ? "Turn off sleep timer" : "Change sleep timer"}
              active={player.sleep !== null}
              onClick={() => player.setSleepTimer(nextSleep ?? null)}
            >
              <SleepIcon size={15} />
              {sleepLabel(player.sleep, player.sleepAt, now)}
            </Pill>
          </div>
        </section>

        <section
          aria-label={panel === "chapters" ? "Chapters" : "Read along"}
          className="flex w-full max-w-[420px] flex-col gap-3 lg:max-h-full lg:overflow-y-auto lg:pt-4"
        >
          <div className="px-3">
            <SegmentedControl<"chapters" | "words">
              label="Show"
              value={panel}
              onChange={setPanel}
              options={[
                { value: "chapters", label: "Chapters" },
                { value: "words", label: "Read along" },
              ]}
            />
          </div>
          {panel === "words" && track ? (
            <ReadAlong
              src={track.src}
              plainTranscript={track.transcript}
              time={time}
              playing={player.playing}
              onSeek={player.seek}
            />
          ) : (
            <>
              {player.ready && player.tracks.length === 0 && (
                <p className="px-3 text-[14px] text-label-secondary">
                  No recordings in this book on this device yet.
                </p>
              )}
              <ol className="flex flex-col">
                {player.tracks.map((entry, index) => {
                  const current = index === player.index;
                  return (
                    <li key={`${entry.chapter}-${entry.src}`}>
                      <button
                        type="button"
                        aria-current={current ? "true" : undefined}
                        onClick={() => (current ? player.toggle() : player.playTrack(index))}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors",
                          current ? "bg-fill/80" : "hover:bg-fill/50",
                        )}
                      >
                        <span
                          className={cn(
                            "w-6 shrink-0 text-center text-[13px] tabular-nums",
                            current ? "text-accent-text" : "text-label-tertiary",
                          )}
                        >
                          {current && player.playing ? <Equalizer /> : index + 1}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 grow truncate text-[15px]",
                            current && "font-semibold",
                          )}
                        >
                          {entry.title}
                        </span>
                        <span className="shrink-0 text-[13px] text-label-tertiary tabular-nums">
                          {entry.durationMs ? clock(entry.durationMs / 1000) : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function TransportButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      data-tooltip={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      className="flex size-11 items-center justify-center rounded-full text-label transition-colors hover:bg-fill/70 disabled:opacity-30"
    >
      {children}
    </motion.button>
  );
}

function Pill({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold tabular-nums transition-colors",
        active
          ? "bg-accent-soft text-accent-text"
          : "bg-fill/70 text-label-secondary hover:text-label",
      )}
    >
      {children}
    </button>
  );
}

/** Three bars bouncing beside the chapter that's playing. */
function Equalizer() {
  return (
    <span className="inline-flex h-3 items-end justify-center gap-[2px]" aria-hidden="true">
      {[0, 0.2, 0.4].map((delay) => (
        <motion.span
          key={delay}
          className="w-[3px] rounded-full bg-current"
          animate={{ height: ["30%", "100%", "45%", "80%", "30%"] }}
          transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, delay }}
        />
      ))}
    </span>
  );
}
