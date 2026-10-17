import { androidBridge } from "../android-bridge";
import { getDeviceId } from "../device-identity";
import { browserNames } from "../device-info";
import { devicePlatform } from "../device-platform";

/** Room and content attribution use the same installation identity. */
export const thisDeviceId = getDeviceId;

const systems = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  chromeos: "ChromeOS",
  ios: "iPhone",
  android: "Android",
  other: "",
} as const;

/** A name people recognise: "TECNO CAMON 19", "iPhone", "Chrome on ChromeOS". */
export function thisDeviceName(): string {
  const { os, app, browser } = devicePlatform();
  if (app) return androidBridge()?.deviceModel?.() || systems[os] || "Notables";
  const system = systems[os];
  const name = browserNames[browser];
  return name && system ? `${name} on ${system}` : name || system || "Browser";
}
