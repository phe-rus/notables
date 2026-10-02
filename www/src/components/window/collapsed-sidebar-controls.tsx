import { SidebarIcon } from "@notables/ui";
import { toggleSidebarCollapsed } from "../../features/settings/store/preferences-store";
import { windowChrome } from "../../platform/window-chrome";
import { ToolbarButton } from "../layout/toolbar-button";
import { WindowControls } from "./window-controls";

/**
 * With the sidebar tucked away on desktop, the first pane carries the
 * window controls and the button that brings the sidebar back.
 */
export function CollapsedSidebarControls() {
  const chrome = windowChrome();
  return (
    <div data-tauri-drag-region className="flex items-center gap-1 max-lg:hidden">
      {chrome === "custom" && <WindowControls className="mr-3" />}
      {chrome === "native-mac" && <div className="w-[64px] shrink-0" />}
      <ToolbarButton label="Show sidebar" onClick={toggleSidebarCollapsed}>
        <SidebarIcon size={17} />
      </ToolbarButton>
    </div>
  );
}
