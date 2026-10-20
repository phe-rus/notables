import { t } from "@/i18n/i18n";
import type { DevicePlatform } from "@/platform/device-platform";

export function settingsPlace(device: DevicePlatform): string {
  if (!device.app) return t("setup.placeBrowser");
  switch (device.os) {
    case "macos":
      return "System Settings › Privacy & Security";
    case "windows":
      return "Settings › Privacy & security";
    case "ios":
      return "Settings › Notables";
    case "android":
      return "Settings › Apps › Notables › Permissions";
    default:
      return t("setup.placeSystem");
  }
}
