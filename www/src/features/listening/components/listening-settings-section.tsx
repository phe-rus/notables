import { SegmentedControl } from "@notables/ui";
import { useEffect, useState } from "react";
import { SelectInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import { SettingsGroup, SettingsRow } from "../../settings/components/settings-controls";
import { useModelPacks } from "../lib/model-packs";
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
  // The list changes when the natural voice is installed, updated or deleted.
  const naturalVersion = useModelPacks()?.find((pack) => pack.kind === "voice")?.installedVersion;
  const lang =
    typeof document === "undefined"
      ? "en"
      : document.documentElement.lang || navigator.language || "en";

  useEffect(() => {
    void availableVoices(lang).then(setVoices);
  }, [lang, naturalVersion]);

  return (
    <SettingsGroup title={t("listening.title")} footer={t("listening.footer")}>
      <SettingsRow label={t("listening.voice")} stacked>
        {voices && voices.length === 0 ? (
          <p className="text-[14px] text-label-secondary">{t("listening.noVoices")}</p>
        ) : (
          <SelectInput
            label={t("listening.voice")}
            value={settings.voiceId ?? ""}
            onChange={(voiceId) => setNarrationSettings({ voiceId: voiceId || null })}
            className="py-2 text-[15px]"
            options={[
              { value: "", label: t("listening.bestVoice") },
              ...(voices ?? []).map((voice) => ({
                value: voice.id,
                label: voice.name,
                detail: voice.natural
                  ? t("listening.natural")
                  : voice.provider === "gemini"
                    ? "Gemini"
                    : voice.offline
                      ? undefined
                      : t("listening.online"),
              })),
            ]}
          />
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
