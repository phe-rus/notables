import { useRouter } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon, cn, SidebarIcon } from "@ultrapeach/ui";
import { AppMark } from "../../../components/brand/app-mark";
import { ToolbarButton } from "../../../components/layout/toolbar-button";
import { WindowControls } from "../../../components/window/window-controls";
import { t } from "../../../i18n/i18n";
import { windowChrome } from "../../../platform/window-chrome";
import { toggleSidebarCollapsed } from "../../settings/store/preferences-store";

/** Window controls, then sidebar, back and forward buttons. */
export function SidebarTopBar() {
  const chrome = windowChrome();
  const router = useRouter();
  return (
    <div data-tauri-drag-region className="flex h-[52px] shrink-0 items-center gap-1 pl-2">
      {chrome === "custom" && <WindowControls className="mr-3" />}
      {/* macOS draws its own traffic lights here. */}
      {chrome === "native-mac" && <div className="w-[64px] shrink-0" />}
      {chrome === "none" && (
        <span className="mr-auto flex items-center gap-2">
          <AppMark size={24} />
          <span className="text-subheadline font-semibold tracking-tight">Notables</span>
        </span>
      )}
      <div
        data-tauri-drag-region
        className={cn("flex items-center gap-0.5", chrome !== "none" && "grow")}
      >
        <ToolbarButton
          label={t("nav.hideSidebar")}
          onClick={toggleSidebarCollapsed}
          className="max-lg:hidden"
        >
          <SidebarIcon size={17} />
        </ToolbarButton>
        <ToolbarButton label={t("common.back")} onClick={() => router.history.back()}>
          <ChevronLeftIcon size={17} />
        </ToolbarButton>
        <ToolbarButton label={t("nav.forward")} onClick={() => router.history.forward()}>
          <ChevronRightIcon size={17} />
        </ToolbarButton>
      </div>
    </div>
  );
}
