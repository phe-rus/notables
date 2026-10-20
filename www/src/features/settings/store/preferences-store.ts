import { useSyncExternalStore } from "react";
import { syncedSetting } from "@/platform/settings/synced-settings";
import { defaultPreferences, normalizePreferences, type Preferences } from "../model/preferences";

/** Where preferences are saved; the pre-paint appearance script reads it too. */
export const PREFERENCES_KEY = "notables:preferences";

/** Kept per device (AC-16): the rest follows the person to their other devices and browsers. */
const DEVICE_KEY = "notables:device-preferences";

type DevicePreferences = Pick<Preferences, "haptics"> & {
  sidebar: Pick<Preferences["sidebar"], "width" | "collapsed">;
};

const shared = syncedSetting(PREFERENCES_KEY);
let current: Preferences | undefined;

function readDevice(): Partial<DevicePreferences> {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_KEY) ?? "{}") as Partial<DevicePreferences>;
  } catch {
    return {};
  }
}

function read(): Preferences {
  if (current) return current;
  const stored = (shared.get() ?? {}) as Partial<Preferences>;
  const device = readDevice();
  current = normalizePreferences({
    ...stored,
    ...(device.haptics === undefined ? {} : { haptics: device.haptics }),
    sidebar: { ...stored.sidebar, ...device.sidebar } as Preferences["sidebar"],
  });
  return current;
}

export function getPreferences(): Preferences {
  return typeof window === "undefined" ? defaultPreferences : read();
}

export function updatePreferences(change: (previous: Preferences) => Preferences): void {
  const next = normalizePreferences(change(read()));
  current = next;
  const device: DevicePreferences = {
    haptics: next.haptics,
    sidebar: { width: next.sidebar.width, collapsed: next.sidebar.collapsed },
  };
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  } catch {
    // Private windows may refuse storage; the change still applies for this session.
  }
  shared.set(next);
}

function subscribe(listener: () => void) {
  const stop = shared.subscribe(() => {
    current = undefined;
    listener();
  });
  // Keep other windows of the app in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PREFERENCES_KEY && event.key !== DEVICE_KEY) return;
    current = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    stop();
    window.removeEventListener("storage", onStorage);
  };
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences, () => defaultPreferences);
}

export function toggleSidebarCollapsed(): void {
  updatePreferences((p) => ({ ...p, sidebar: { ...p.sidebar, collapsed: !p.sidebar.collapsed } }));
}
