import { androidBridge } from "./android-bridge";
import { type Browser, devicePlatform, type OperatingSystem } from "./device-platform";
import { isTauri } from "./runtime";

/** What About shows about the device Notables runs on. */
export interface DeviceInfo {
  /** The device's own name or model, when the system shares one. */
  device: string | null;
  /** The system with its version, e.g. "Android 13" or "macOS 15.1". */
  system: string;
  architecture: string | null;
  /** The browser, when this is the web app. */
  browser: Browser | null;
}

const systemNames: Record<OperatingSystem, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  chromeos: "ChromeOS",
  ios: "iOS",
  android: "Android",
  other: "",
};

export const browserNames: Record<Browser, string> = {
  safari: "Safari",
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  other: "",
};

/** Names that say nothing about the device, which About leaves out. */
const generic = /^(localhost|iphone|ipad|android|unknown)?$/i;

interface UserAgentData {
  getHighEntropyValues(hints: string[]): Promise<{ platformVersion?: string; model?: string }>;
}

export async function deviceInfo(): Promise<DeviceInfo> {
  const { os, browser } = devicePlatform();
  if (isTauri()) {
    const plugin = await import("@tauri-apps/plugin-os");
    const [version, host] = await Promise.all([
      Promise.resolve(plugin.version()).catch(() => ""),
      plugin.hostname().catch(() => null),
    ]);
    const model = androidBridge()?.deviceModel?.() ?? null;
    const name = model || host;
    return {
      device: name && !generic.test(name.trim()) ? name.trim() : null,
      system: `${systemNames[os]} ${version}`.trim(),
      architecture: plugin.arch(),
      browser: null,
    };
  }
  // Chromium browsers share the real system version and phone model on request.
  const data = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
  const high = await data?.getHighEntropyValues(["platformVersion", "model"]).catch(() => null);
  const version = os === "android" || os === "macos" ? (high?.platformVersion ?? "") : "";
  return {
    device: high?.model || null,
    system: `${systemNames[os]} ${version}`.trim() || navigator.platform,
    architecture: null,
    browser,
  };
}
