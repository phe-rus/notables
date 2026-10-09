import {
  CloseIcon,
  cn,
  IconButton,
  NextTrackIcon,
  openMenu,
  PauseIcon,
  PlayIcon,
  PreviousTrackIcon,
  spring,
} from "@ultrapeach/ui";
import { motion } from "motion/react";
import { t } from "../../../i18n/i18n";
import {
  NARRATION_RATES,
  rateName,
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
    const current = settings.voiceId ?? voices[0]?.id;
    openMenu(
      anchor,
      voices.length === 0
        ? [{ label: t("listening.noVoices"), disabled: true, onSelect: () => {} }]
        : voices.slice(0, 12).map((voice) => ({
            label: `${voice.name}${voice.natural ? ` · ${t("listening.natural")}` : ""}${voice.provider === "gemini" ? " · Gemini" : ""}`,
            checked: voice.id === current,
            onSelect: () => setNarrationSettings({ voiceId: voice.id }),
          })),
      { edge: "trailing", above: true },
    );
  };

  return (
    <motion.div
      role="region"
      aria-label={t("listening.readingAloud")}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={spring.smooth}
      className={cn("glass-menu flex items-center gap-1 rounded-full px-2 py-1.5", className)}
    >
      <IconButton
        label={t("listening.previousSentence")}
        disabled={state.index <= 0}
        onClick={() => onSeek(state.index - 1)}
      >
        <PreviousTrackIcon size={18} />
      </IconButton>
      <IconButton
        label={state.playing ? t("listening.pause") : t("notes.readAloud")}
        tone="accent"
        onClick={onToggle}
      >
        {state.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
      </IconButton>
      <IconButton
        label={t("listening.nextSentence")}
        disabled={state.index + 1 >= state.total}
        onClick={() => onSeek(state.index + 1)}
      >
        <NextTrackIcon size={18} />
      </IconButton>
      <button
        type="button"
        onClick={() => setNarrationSettings({ rate: nextRate })}
        aria-label={`${t("listening.speed")}: ${rateName(settings.rate)}, ${settings.rate}×`}
        title={`${settings.rate}×`}
        className="rounded-full px-2.5 py-1 text-footnote font-semibold transition-colors hover:bg-fill/60"
      >
        {rateName(settings.rate)}
      </button>
      <button
        type="button"
        onClick={(event) => void chooseVoice(event.currentTarget)}
        className="rounded-full px-2.5 py-1 text-footnote font-medium text-label-secondary transition-colors hover:bg-fill/60"
      >
        {t("listening.voice")}
      </button>
      {state.error && (
        <span className="max-w-[180px] truncate px-1 text-caption text-danger" title={state.error}>
          {state.error}
        </span>
      )}
      <IconButton label={t("notes.stopReading")} onClick={onClose}>
        <CloseIcon size={16} />
      </IconButton>
    </motion.div>
  );
}
