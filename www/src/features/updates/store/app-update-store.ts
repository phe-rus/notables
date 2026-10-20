import { createUpdateMonitor } from "../lib/create-update-monitor";
import { fetchReleaseManifest } from "../lib/fetch-release-manifest";
import { readInstalledRelease } from "../lib/read-installed-release";
import type { UpdateMonitor, UpdateState } from "../model/types";

const empty: UpdateState = {
  installed: null,
  release: null,
  required: false,
  deadline: null,
  checking: false,
  failed: false,
};
let monitor: UpdateMonitor | null = null;
let initialization: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

async function initialize() {
  const installed = await readInstalledRelease();
  if (!installed) return;
  const { channel, version, build } = installed;
  const key = `notables:update-policy:${channel}:${version}:${build}`;
  monitor = createUpdateMonitor({
    installed,
    now: Date.now,
    read: () => localStorage.getItem(key),
    write: (value) => localStorage.setItem(key, value),
    load: fetchReleaseManifest,
  });
  monitor.subscribe(notify);
  notify();
}

/** One monitor for every consumer. Importing the module starts no browser work. */
export const appUpdateStore = {
  getState: () => monitor?.getState() ?? empty,
  getServerState: () => empty,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  async check() {
    initialization ??= initialize().catch(() => {
      initialization = null;
    });
    await initialization;
    await monitor?.check();
  },
  tick: () => monitor?.tick(),
};
