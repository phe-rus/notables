import { isTauri } from "./runtime";

export type OperatingSystem =
  | "macos"
  | "windows"
  | "linux"
  | "chromeos"
  | "ios"
  | "android"
  | "other";
export type Browser = "safari" | "chrome" | "edge" | "firefox" | "other";

export interface DevicePlatform {
  os: OperatingSystem;
  /** The installed Notables app, rather than a web browser. */
  app: boolean;
  browser: Browser;
}

/** Which system and browser this is, to give directions that match the screen. */
export function devicePlatform(): DevicePlatform {
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  // iPadOS reports itself as a Mac, but has touch.
  const touchMac =
    /Macintosh/.test(agent) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  const os: OperatingSystem =
    /iPhone|iPad|iPod/.test(agent) || touchMac
      ? "ios"
      : /Android/.test(agent)
        ? "android"
        : /CrOS/.test(agent)
          ? "chromeos"
          : /Mac/.test(agent)
            ? "macos"
            : /Windows/.test(agent)
              ? "windows"
              : /Linux/.test(agent)
                ? "linux"
                : "other";
  const browser: Browser = /Edg\//.test(agent)
    ? "edge"
    : /Firefox|FxiOS/.test(agent)
      ? "firefox"
      : /Chrome|CriOS|Chromium/.test(agent)
        ? "chrome"
        : /Safari/.test(agent)
          ? "safari"
          : "other";
  return { os, app: isTauri(), browser };
}
