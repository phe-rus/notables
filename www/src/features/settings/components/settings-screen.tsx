import { useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon, IconButton, SidebarIcon, useMediaQuery } from "@ultrapeach/ui";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { t } from "../../../i18n/i18n";
import { usePreferences } from "../store/preferences-store";
import { type SettingsPageId, settingsPages } from "./settings-catalog";
import { SettingsList } from "./settings-list";

/**
 * Settings, as Apple arranges it: a list of categories that opens pages.
 * Wide windows keep the list beside the open page, like System Settings;
 * phones show one at a time, with a back button, like iOS.
 */
export function SettingsScreen({
  page,
  onOpenSidebar,
}: {
  page: SettingsPageId | null;
  onOpenSidebar: () => void;
}) {
  const { sidebar } = usePreferences();
  const navigate = useNavigate();
  const wide = useMediaQuery("(min-width: 1024px)");
  // A wide window always has a page open; Appearance is the natural first.
  const open = page ?? (wide ? "appearance" : null);
  const showList = wide || open === null;
  const title = !wide && open ? settingsPages[open].title : t("settings.title");
  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2"
      >
        {sidebar.collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center gap-1">
          {!wide && open ? (
            <IconButton label={t("common.back")} onClick={() => void navigate({ to: "/settings" })}>
              <ChevronLeftIcon size={20} className="rtl:-scale-x-100" />
            </IconButton>
          ) : (
            <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
          )}
          <h1 className="truncate text-title2 font-bold tracking-tight">{title}</h1>
        </div>
      </header>

      <div className="flex min-h-0 grow">
        {showList && (
          <div
            className={
              wide
                ? "w-[320px] shrink-0 overflow-y-auto border-e border-separator/60 px-4 pt-3 pb-10"
                : "grow overflow-y-auto px-4 pt-3 pb-32"
            }
          >
            <SettingsList current={wide ? open : null} />
          </div>
        )}
        {open && (
          <div className="grow overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-4 pt-3 pb-32 sm:px-5 md:pb-24">
              {wide && (
                <h2 className="px-1 text-title3 font-semibold">{settingsPages[open].title}</h2>
              )}
              {settingsPages[open].content()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
