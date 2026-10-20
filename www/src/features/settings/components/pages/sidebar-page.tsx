import { LabeledContent, Section, Toggle, useMediaQuery } from "@phe-rus/hino";
import { type Preferences, sidebarWidth } from "@/features/settings/model/preferences";
import { updatePreferences, usePreferences } from "@/features/settings/store/preferences-store";
import { t } from "@/i18n/i18n";

const setSidebar = (change: Partial<Preferences["sidebar"]>) =>
  updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, ...change } }));

export function SidebarPage() {
  const { sidebar } = usePreferences();
  const wide = useMediaQuery("(min-width: 1024px)");
  return (
    <Section title={t("settings.sidebar")}>
      <LabeledContent label={t("settings.showCounts")}>
        <Toggle
          label={t("settings.showCounts")}
          checked={sidebar.counts}
          onChange={(counts) => setSidebar({ counts })}
        />
      </LabeledContent>
      {wide && (
        <LabeledContent
          label={t("settings.width")}
          description={t("settings.widthPoints", { count: sidebar.width })}
        >
          <button
            type="button"
            disabled={sidebar.width === sidebarWidth.default}
            onClick={() => setSidebar({ width: sidebarWidth.default })}
            className="text-subheadline font-medium text-accent-text disabled:text-label-tertiary"
          >
            {t("common.reset")}
          </button>
        </LabeledContent>
      )}
    </Section>
  );
}
