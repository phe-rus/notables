import { LabeledContent, Section, SwatchPicker } from "@phe-rus/hino";
import { accents } from "@phe-rus/hino/tokens";
import { PickerInput } from "../../../../components/form/form-fields";
import {
  type LanguageChoice,
  setLanguageChoice,
  t,
  useLanguageChoice,
} from "../../../../i18n/i18n";
import { languages } from "../../../../i18n/languages";
import { isTauri } from "../../../../platform/runtime";
import {
  type Preferences,
  type TextSize,
  type ThemePreference,
  textSizes,
} from "../../model/preferences";
import { updatePreferences, usePreferences } from "../../store/preferences-store";

const set = (change: Partial<Preferences>) => updatePreferences((p) => ({ ...p, ...change }));

/** App appearance; writing typography lives with the writing preferences. */
export function AppearancePage() {
  const preferences = usePreferences();
  const languageChoice = useLanguageChoice();
  return (
    <>
      <Section title={isTauri() ? undefined : t("settings.appearance")}>
        <LabeledContent label={t("settings.theme")}>
          <PickerInput<ThemePreference>
            className="w-auto text-subheadline"
            label={t("settings.theme")}
            value={preferences.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: "system", label: t("settings.themeAuto") },
              { value: "light", label: t("settings.themeLight") },
              { value: "dark", label: t("settings.themeDark") },
            ]}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.textSize")} description={t("settings.textSizeHint")}>
          <PickerInput<TextSize>
            className="w-auto text-subheadline"
            label={t("settings.textSize")}
            value={preferences.textSize}
            onChange={(textSize) => set({ textSize })}
            options={(Object.keys(textSizes) as TextSize[]).map((size) => ({
              value: size,
              label: textSizes[size].label,
            }))}
          />
        </LabeledContent>
        <LabeledContent label={t("settings.language")} description={t("settings.languageHint")}>
          <PickerInput<LanguageChoice>
            label={t("settings.language")}
            value={languageChoice}
            onChange={setLanguageChoice}
            className="w-auto min-w-[10rem] py-1.5 text-subheadline"
            options={[
              { value: "system", label: t("settings.languageSystem") },
              ...languages.map((language) => ({
                value: language.id,
                label: language.name,
                lang: language.id,
              })),
            ]}
          />
        </LabeledContent>
      </Section>
      <Section title={t("settings.accent")} footer={t("settings.accentHint")}>
        <div className="p-3">
          <SwatchPicker
            label={t("setup.accentColour")}
            value={preferences.accent}
            onChange={(accent) => set({ accent })}
            options={Object.values(accents).map((accent) => ({
              value: accent.id,
              label: accent.name,
              color: accent.swatch,
              ink: accent.light.onAccent,
            }))}
          />
        </div>
      </Section>
    </>
  );
}
