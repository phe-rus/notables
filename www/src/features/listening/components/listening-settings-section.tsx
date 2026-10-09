import { LabeledContent, Section } from "@ultrapeach/ui";
import { useEffect, useState } from "react";
import { PickerInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import { useModelPacks } from "../lib/model-packs";
import {
  NARRATION_RATES,
  rateName,
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
    <Section title={t("listening.title")} footer={t("listening.footer")}>
      <LabeledContent label={t("listening.voice")} stacked>
        {voices && voices.length === 0 ? (
          <p className="text-subheadline text-label-secondary">{t("listening.noVoices")}</p>
        ) : (
          <PickerInput
            label={t("listening.voice")}
            value={settings.voiceId ?? ""}
            onChange={(voiceId) => setNarrationSettings({ voiceId: voiceId || null })}
            className="py-2 text-subheadline"
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
      </LabeledContent>
      <LabeledContent label={t("listening.speed")}>
        <PickerInput
          label={t("listening.speed")}
          value={String(settings.rate)}
          onChange={(rate) => setNarrationSettings({ rate: Number(rate) })}
          className="w-auto min-w-[8.5rem] py-1.5 text-subheadline"
          options={NARRATION_RATES.map((rate) => ({
            value: String(rate),
            label: rateName(rate),
            detail: `${rate}×`,
          }))}
        />
      </LabeledContent>
    </Section>
  );
}
