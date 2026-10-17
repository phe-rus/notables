import { FolderIcon, LabeledContent, Section, Toggle } from "@phe-rus/hino";
import { Link } from "@tanstack/react-router";
import { t } from "../../../../i18n/i18n";
import { useFolders } from "../../../library/store/library-store";
import { type Preferences, sidebarWidth } from "../../model/preferences";
import { updatePreferences, usePreferences } from "../../store/preferences-store";

const setSidebar = (change: Partial<Preferences["sidebar"]>) =>
  updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, ...change } }));

export function SidebarPage() {
  const { sidebar } = usePreferences();
  const folders = useFolders();
  return (
    <Section title={t("settings.sidebar")}>
      {folders.map((folder) => (
        <Link
          key={folder.id}
          to="/"
          search={{ view: `folder:${folder.id}` }}
          className="flex items-center gap-3 px-4 py-3 text-body text-label"
        >
          <FolderIcon size={18} />
          {folder.name}
        </Link>
      ))}
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
          className="text-subheadline font-medium text-accent-text disabled:text-label-tertiary"
        >
          {t("common.reset")}
        </button>
      </LabeledContent>
    </Section>
  );
}
