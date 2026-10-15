import { androidBridge } from "../android-bridge";
import { browserNames } from "../device-info";
import { devicePlatform } from "../device-platform";

const DEVICE_ID = "notables:device-id";

/** This device's id in rooms: random, made once, never derived from anything about it. */
export function thisDeviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_ID);
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

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
