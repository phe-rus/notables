import { SegmentedControl } from "@notables/ui";
import { useEffect, useState } from "react";
import { SettingsGroup, SettingsRow } from "../../settings/components/settings-controls";
import {
  NARRATION_RATES,
  setNarrationSettings,
  useNarrationSettings,
} from "../lib/narration-settings";
import { availableVoices } from "../lib/use-narration";
import type { Voice } from "../lib/voices";

/** The voice and pace used to read books and notes aloud. */
export function ListeningSettingsSection() {
  const settings = useNarrationSettings();
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const lang =
    typeof document === "undefined"
      ? "en"
      : document.documentElement.lang || navigator.language || "en";

  useEffect(() => {
    void availableVoices(lang).then(setVoices);
  }, [lang]);

  return (
    <SettingsGroup
      title="Listening"
      footer="Natural voices sound most like a person. Device voices work offline; Gemini voices use your Gemini key."
    >
      <SettingsRow label="Voice" stacked>
        {voices && voices.length === 0 ? (
          <p className="text-[14px] text-label-secondary">
            This device has no voices for reading aloud.
          </p>
        ) : (
          <select
            aria-label="Voice"
            value={settings.voiceId ?? ""}
            onChange={(event) => setNarrationSettings({ voiceId: event.target.value || null })}
            className="w-full rounded-[10px] control-field px-3 py-2 text-[15px] text-label"
          >
            <option value="">Best available</option>
            {(voices ?? []).map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
                {voice.natural ? " · Natural" : ""}
                {voice.provider === "gemini" ? " · Gemini" : voice.offline ? "" : " · Online"}
              </option>
            ))}
          </select>
        )}
      </SettingsRow>
      <SettingsRow label="Speed" wide>
        <SegmentedControl<string>
          label="Reading speed"
          value={String(settings.rate)}
          onChange={(rate) => setNarrationSettings({ rate: Number(rate) })}
          options={NARRATION_RATES.map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
