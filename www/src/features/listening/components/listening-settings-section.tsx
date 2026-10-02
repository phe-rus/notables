import { SegmentedControl } from "@notables/ui";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
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
    <SettingsGroup title={t("listening.title")} footer={t("listening.footer")}>
      <SettingsRow label={t("listening.voice")} stacked>
        {voices && voices.length === 0 ? (
          <p className="text-[14px] text-label-secondary">{t("listening.noVoices")}</p>
        ) : (
          <select
            aria-label={t("listening.voice")}
            value={settings.voiceId ?? ""}
            onChange={(event) => setNarrationSettings({ voiceId: event.target.value || null })}
            className="w-full rounded-[10px] control-field px-3 py-2 text-[15px] text-label"
          >
            <option value="">{t("listening.bestVoice")}</option>
            {(voices ?? []).map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
                {voice.natural ? ` · ${t("listening.natural")}` : ""}
                {voice.provider === "gemini"
                  ? " · Gemini"
                  : voice.offline
                    ? ""
                    : ` · ${t("listening.online")}`}
              </option>
            ))}
          </select>
        )}
      </SettingsRow>
      <SettingsRow label={t("listening.speed")} wide>
        <SegmentedControl<string>
          label={t("listening.speed")}
          value={String(settings.rate)}
          onChange={(rate) => setNarrationSettings({ rate: Number(rate) })}
          options={NARRATION_RATES.map((rate) => ({ value: String(rate), label: `${rate}×` }))}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
