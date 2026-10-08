import { LabeledContent, Section, Toggle } from "@ultrapeach/ui";
import { t } from "../../../../i18n/i18n";
import { sidebarIcons } from "../../../library/components/library-sidebar";
import { SidebarEditor } from "../../../library/components/sidebar-editor";
import { type Preferences, sidebarWidth } from "../../model/preferences";
import { updatePreferences, usePreferences } from "../../store/preferences-store";

const setSidebar = (change: Partial<Preferences["sidebar"]>) =>
  updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, ...change } }));

/** What the sidebar shows, in which order, and how wide. */
export function SidebarPage() {
  const { sidebar } = usePreferences();
  return (
    <Section title={t("settings.sidebar")} footer={t("settings.sidebarFooter")}>
      <div className="px-2.5 py-2">
        <SidebarEditor icons={sidebarIcons} />
      </div>
      <LabeledContent label={t("settings.showCounts")}>
        <Toggle
          label={t("settings.showCounts")}
          checked={sidebar.counts}
          onChange={(counts) => setSidebar({ counts })}
        />
      </LabeledContent>
      <LabeledContent
        label={t("settings.width")}
        description={t("settings.widthPoints", { count: sidebar.width })}
      >
        <button
          type="button"
          disabled={sidebar.width === sidebarWidth.default}
          onClick={() => setSidebar({ width: sidebarWidth.default })}
          className="text-[14px] font-medium text-accent-text disabled:text-label-tertiary"
        >
          {t("common.reset")}
        </button>
      </LabeledContent>
    </Section>
  );
}
