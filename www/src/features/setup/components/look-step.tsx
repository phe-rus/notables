import { Picker, SegmentedControl, SwatchPicker } from "@phe-rus/hino";
import { accents } from "@phe-rus/hino/tokens";
import {
  type NoteFont,
  noteFontFamilies,
  noteFontLabels,
  noteFonts,
} from "@/features/library/model/note-fonts";
import type { ThemePreference } from "@/features/settings/model/preferences";
import { updatePreferences, usePreferences } from "@/features/settings/store/preferences-store";
import { t } from "@/i18n/i18n";
import { StepTitle } from "./step-title";

export function LookStep() {
  const preferences = usePreferences();
  const set = (change: Partial<typeof preferences>) =>
    updatePreferences((current) => ({ ...current, ...change }));
  return (
    <>
      <StepTitle title={t("setup.lookTitle")}>{t("setup.lookBody")}</StepTitle>
      <div className="flex flex-col gap-5">
        <SegmentedControl<ThemePreference>
          label={t("settings.theme")}
          value={preferences.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: "system", label: t("settings.themeAuto") },
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
          ]}
        />
        <div className="flex flex-col gap-2">
          <span className="text-footnote font-medium text-label-secondary">
            {t("setup.accentColour")}
          </span>
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
        <div className="flex flex-col gap-2">
          <span className="text-footnote font-medium text-label-secondary">
            {t("setup.writingFont")}
          </span>
          <Picker<NoteFont>
            label={t("setup.writingFont")}
            value={preferences.noteFont}
            onChange={(noteFont) => set({ noteFont })}
            options={noteFonts.map((font) => ({ value: font, label: noteFontLabels[font] }))}
          />
          <p
            className="rounded-2xl bg-fill/60 px-4 py-3 text-title3"
            style={{ fontFamily: noteFontFamilies[preferences.noteFont] }}
          >
            {t("setup.writeAnything")}
          </p>
        </div>
      </div>
    </>
  );
}
