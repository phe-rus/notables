import { ChevronLeftIcon, IconButton, SidebarIcon, useMediaQuery } from "@phe-rus/hino";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CollapsedSidebarControls } from "@/components/window/collapsed-sidebar-controls";
import { t } from "@/i18n/i18n";
import { isTauri } from "@/platform/runtime";
import { usePreferences } from "../store/preferences-store";
import { type SettingsPageId, settingsPages } from "./settings-catalog";
import { SettingsList } from "./settings-list";
import { SettingsToolbarContext } from "./settings-toolbar";

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
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const wide = useMediaQuery("(min-width: 1024px)");
  // A wide window always has a page open; Appearance is the natural first.
  const open = page ?? (wide ? "appearance" : null);
  const showList = wide || open === null;
  const title = !wide && open ? settingsPages[open].title : t("settings.title");
  return (
    <SettingsToolbarContext value={toolbarHost}>
      <div
        data-native-settings={isTauri() ? "" : undefined}
        className="flex min-h-0 grow flex-col bg-fill/45"
      >
        <header
          data-tauri-drag-region
          className="flex flex-col gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2"
        >
          {sidebar.collapsed && <CollapsedSidebarControls />}
          <div data-tauri-drag-region className="flex items-center gap-1">
            {!wide && open ? (
              <IconButton
                size="icon-sm"
                variant="ghost"
                label={t("common.back")}
                onClick={() => void navigate({ to: "/settings" })}
              >
                <ChevronLeftIcon size={20} className="rtl:-scale-x-100" />
              </IconButton>
            ) : (
              <IconButton
                size="icon-sm"
                variant="ghost"
                label={t("nav.showLibrary")}
                className="hidden md:inline-flex lg:hidden"
                onClick={onOpenSidebar}
              >
                <SidebarIcon size={20} />
              </IconButton>
            )}
            <h1 className="truncate text-title3 font-bold tracking-tight">{title}</h1>
            {!wide && open && <div ref={setToolbarHost} className="ms-auto shrink-0" />}
          </div>
        </header>

        <div className="flex min-h-0 grow">
          {showList && (
            <div
              className={
                wide
                  ? "w-[320px] shrink-0 overflow-y-auto border-e border-separator/60 px-4 pt-3 pb-10"
                  : "scroll-surface min-h-0 grow px-4 pt-3"
              }
            >
              <SettingsList current={wide ? open : null} />
            </div>
          )}
          {open && (
            <div className="scroll-surface min-h-0 grow">
              <div className="native-settings-detail mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 pt-3 sm:px-5 md:pb-24">
                {wide && (
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="px-1 text-title3 font-semibold">{settingsPages[open].title}</h2>
                    <div ref={setToolbarHost} className="shrink-0" />
                  </div>
                )}
                {settingsPages[open].content()}
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsToolbarContext>
  );
}
