import {
  CloseIcon,
  cn,
  IconButton,
  NextTrackIcon,
  openContextMenu,
  PauseIcon,
  PlayIcon,
  PreviousTrackIcon,
  spring,
} from "@notables/ui";
import { motion } from "motion/react";
import {
  NARRATION_RATES,
  setNarrationSettings,
  useNarrationSettings,
} from "../lib/narration-settings";
import type { NarratorState } from "../lib/narrator";
import { availableVoices } from "../lib/use-narration";

/** Controls for reading aloud: play, skip a sentence, speed and voice. */
export function NarrationBar({
  state,
  lang,
  onToggle,
  onSeek,
  onClose,
  className,
}: {
  state: NarratorState;
  lang: string;
  onToggle: () => void;
  onSeek: (index: number) => void;
  onClose: () => void;
  className?: string;
}) {
  const settings = useNarrationSettings();
  const nextRate =
    NARRATION_RATES[
      (NARRATION_RATES.indexOf(settings.rate as never) + 1) % NARRATION_RATES.length
    ] ?? 1;

  const chooseVoice = async (anchor: HTMLElement) => {
    const voices = await availableVoices(lang);
    const rect = anchor.getBoundingClientRect();
    const current = settings.voiceId ?? voices[0]?.id;
    openContextMenu(
      Math.max(12, rect.left - 120),
      Math.max(12, rect.top - Math.min(voices.length, 9) * 38 - 20),
      voices.length === 0
        ? [{ label: "No voices on this device", disabled: true, onSelect: () => {} }]
        : voices.slice(0, 12).map((voice) => ({
            label: `${voice.name}${voice.natural ? " · Natural" : ""}${voice.provider === "gemini" ? " · Gemini" : ""}`,
            checked: voice.id === current,
            onSelect: () => setNarrationSettings({ voiceId: voice.id }),
          })),
    );
  };

  return (
    <motion.div
      role="region"
      aria-label="Reading aloud"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={spring.smooth}
      className={cn("glass-menu flex items-center gap-1 rounded-full px-2 py-1.5", className)}
    >
      <IconButton
        label="Previous sentence"
        disabled={state.index <= 0}
        onClick={() => onSeek(state.index - 1)}
      >
        <PreviousTrackIcon size={18} />
      </IconButton>
      <IconButton label={state.playing ? "Pause" : "Read aloud"} tone="accent" onClick={onToggle}>
        {state.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
      </IconButton>
      <IconButton
        label="Next sentence"
        disabled={state.index + 1 >= state.total}
        onClick={() => onSeek(state.index + 1)}
      >
        <NextTrackIcon size={18} />
      </IconButton>
      <button
        type="button"
        onClick={() => setNarrationSettings({ rate: nextRate })}
        aria-label={`Speed ${nextRate}×`}
        className="rounded-full px-2.5 py-1 text-[13px] font-semibold tabular-nums transition-colors hover:bg-fill/60"
      >
        {settings.rate}×
      </button>
      <button
        type="button"
        onClick={(event) => void chooseVoice(event.currentTarget)}
        className="rounded-full px-2.5 py-1 text-[13px] font-medium text-label-secondary transition-colors hover:bg-fill/60"
      >
        Voice
      </button>
      {state.error && (
        <span className="max-w-[180px] truncate px-1 text-[12px] text-danger" title={state.error}>
          {state.error}
        </span>
      )}
      <IconButton label="Stop reading aloud" onClick={onClose}>
        <CloseIcon size={16} />
      </IconButton>
    </motion.div>
  );
}
