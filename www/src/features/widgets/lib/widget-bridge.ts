import { invoke } from "@tauri-apps/api/core";
import { devicePlatform } from "../../../platform/device-platform";
import { isTauri } from "../../../platform/runtime";
import { buildWidgetSnapshot } from "./widget-snapshot";

const DESKTOP_KEY = "notables:desktop-widget";

/** Desktop apps can float a widget window; phones use home-screen widgets. */
export function supportsDesktopWidget(): boolean {
  if (!isTauri()) return false;
  const { os } = devicePlatform();
  return os === "macos" || os === "windows" || os === "linux";
}

export function desktopWidgetWanted(): boolean {
  try {
    return localStorage.getItem(DESKTOP_KEY) === "on";
  } catch {
    return false;
  }
}

export async function setDesktopWidget(show: boolean): Promise<boolean> {
  try {
    localStorage.setItem(DESKTOP_KEY, show ? "on" : "off");
  } catch {
    // Not remembered next launch.
  }
  if (!supportsDesktopWidget()) return false;
  return invoke<boolean>("widgets_desktop", { show });
}

/** Saves what widgets show; the native widgets read it from the app's data folder. */
export async function publishWidgetSnapshot(): Promise<void> {
  if (!isTauri()) return;
  await invoke("widgets_publish", { snapshot: JSON.stringify(buildWidgetSnapshot()) });
}

/** From the desktop widget: bring the main window forward at a place. */
export async function openFromWidget(path: string): Promise<void> {
  if (isTauri()) await invoke("widgets_open", { path });
  else window.location.assign(path);
}
