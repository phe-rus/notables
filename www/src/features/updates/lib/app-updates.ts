import { useSyncExternalStore } from "react";
import { deployedSite } from "../../../platform/public-url";
import { isTauri } from "../../../platform/runtime";
import { isReleaseChannel, updateDestinations } from "./release-policy";
import { createUpdateMonitor, type UpdateState } from "./update-monitor";

const empty: UpdateState = {
  installed: null,
  release: null,
  required: false,
  deadline: null,
  checking: false,
  failed: false,
};
let monitor: ReturnType<typeof createUpdateMonitor> | null = null;
let initialization: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => monitor?.getState() ?? empty;

export function useAppUpdates() {
  return useSyncExternalStore(subscribe, snapshot, () => empty);
}

async function initialize() {
  if (!isTauri() || import.meta.env.DEV) return;
  const build = Number(import.meta.env.VITE_BUILD_NUMBER);
  if (!Number.isSafeInteger(build) || build < 1) return;
  const [{ getVersion }, { invoke }] = await Promise.all([
    import("@tauri-apps/api/app"),
    import("@tauri-apps/api/core"),
  ]);
  const [version, channel] = await Promise.all([
    getVersion(),
    invoke<unknown>("app_release_channel"),
  ]);
  if (!isReleaseChannel(channel)) return;
  const key = `notables:update-policy:${channel}:${version}:${build}`;
  monitor = createUpdateMonitor({
    installed: { version, build, channel },
    now: Date.now,
    read: () => localStorage.getItem(key),
    write: (value) => localStorage.setItem(key, value),
    load: async () => {
      const response = await fetch(new URL("/api/app-release", deployedSite()), {
        cache: "no-store",
        credentials: "omit",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("update-check-failed");
      return response.json();
    },
  });
  monitor.subscribe(notify);
  notify();
}

export async function checkAppUpdates() {
  initialization ??= initialize().catch(() => {
    initialization = null;
  });
  await initialization;
  await monitor?.check();
}

export function updateDestination(): string | null {
  const installed = snapshot().installed;
  return installed ? updateDestinations[installed.channel] : null;
}

/** Launch, foreground, restored connectivity and a small visible-only heartbeat. */
export function startAppUpdates() {
  if (!isTauri() || import.meta.env.DEV) return;
  const check = () => {
    if (document.visibilityState === "visible") void checkAppUpdates();
  };
  check();
  window.addEventListener("online", check);
  document.addEventListener("visibilitychange", check);
  const timer = setInterval(
    () => {
      monitor?.tick();
      check();
    },
    60 * 60 * 1000,
  );
  // Check deadlines promptly even while the editor stays open for a long session.
  const deadline = setInterval(() => monitor?.tick(), 60 * 1000);
  return () => {
    window.removeEventListener("online", check);
    document.removeEventListener("visibilitychange", check);
    clearInterval(timer);
    clearInterval(deadline);
  };
}
