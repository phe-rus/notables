import type { AppRelease, UpdateDependencies, UpdateMonitor, UpdateState } from "../model/types";
import { isUpdateAvailable } from "./is-update-available";
import { parseRelease } from "./parse-release";
import { readReleasePolicy } from "./read-release-policy";
import { updateDeadline } from "./update-deadline";

/** A cached deadline survives offline launches; a valid revocation clears it. */
export function createUpdateMonitor(deps: UpdateDependencies): UpdateMonitor {
  let release: AppRelease | null = null;
  let deadline: number | null = null;
  let latestTime = deps.now();
  try {
    const cache = JSON.parse(deps.read() ?? "null");
    if (cache?.channel === deps.installed.channel) {
      release = parseRelease(cache.release);
      if (release && Number.isFinite(cache.deadline)) deadline = cache.deadline;
      if (Number.isFinite(cache.latestTime)) latestTime = Math.max(latestTime, cache.latestTime);
    }
  } catch {
    /* A broken cache never locks the app. */
  }
  let state: UpdateState = {
    installed: deps.installed,
    release: null,
    required: false,
    deadline: null,
    checking: false,
    failed: false,
  };
  const listeners = new Set<() => void>();
  let pending: Promise<void> | null = null;
  const publish = () => {
    latestTime = Math.max(latestTime, deps.now());
    const available =
      release &&
      Date.parse(release.availableAt) <= latestTime &&
      isUpdateAvailable(release, deps.installed)
        ? release
        : null;
    deadline = available ? Math.min(deadline ?? Infinity, updateDeadline(available)) : null;
    state = {
      ...state,
      release: available,
      deadline,
      required: Boolean(available && deadline !== null && latestTime >= deadline),
    };
    try {
      deps.write(
        JSON.stringify({ channel: deps.installed.channel, release, deadline, latestTime }),
      );
    } catch {
      /* Storage may be full. */
    }
    for (const listener of listeners) listener();
  };
  publish();
  const check = (): Promise<void> => {
    if (pending) return pending;
    state = { ...state, checking: true, failed: false };
    publish();
    pending = (async () => {
      try {
        const next = readReleasePolicy(await deps.load(), deps.installed.channel);
        if (next && Date.parse(next.availableAt) > deps.now())
          throw new Error("release-not-available");
        release = next;
      } catch {
        state = { ...state, failed: true };
      } finally {
        state = { ...state, checking: false };
        pending = null;
        publish();
      }
    })();
    return pending;
  };
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    check,
    tick: publish,
  };
}
