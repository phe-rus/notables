import { spaceIdOf } from "@notables/sync";
import type { SpaceDevice } from "./types";

const listeners = new Set<() => void>();
const known = new Map<string, SpaceDevice>();
let snapshot: SpaceDevice[] = [];
let historyKey = "";
let online = new Set<string>();
let selfId = "";

export const knownDevicesKey = (spaceId: string) => `notables:known-devices:${spaceId}`;

function remember(device: SpaceDevice, replaceKey = false) {
  // The first key seen stays: a later hello can't swap in another (trust on first use).
  known.set(device.id, {
    ...device,
    key: replaceKey ? device.key : (known.get(device.id)?.key ?? device.key),
  });
  try {
    localStorage.setItem(historyKey, JSON.stringify([...known.values()]));
  } catch {
    /* Live status still works. */
  }
  publish();
}

function loadKnown(root: Uint8Array) {
  historyKey = knownDevicesKey(spaceIdOf(root));
  known.clear();
  try {
    const records: unknown = JSON.parse(localStorage.getItem(historyKey) ?? "[]");
    if (Array.isArray(records))
      for (const record of records.slice(0, 100)) {
        if (
          record &&
          typeof record.id === "string" &&
          typeof record.name === "string" &&
          typeof record.platform === "string" &&
          typeof record.lastSeen === "number" &&
          (record.key === undefined || typeof record.key === "string")
        )
          known.set(record.id, { ...record, online: false });
      }
  } catch {
    /* No history on a new device. */
  }
}

function publish() {
  snapshot = [...known.values()]
    .filter((device) => device.id !== selfId)
    .map((device) => ({ ...device, online: online.has(device.id) }))
    .sort((a, b) => Number(b.online) - Number(a.online) || b.lastSeen - a.lastSeen);
  for (const listener of listeners) listener();
}

/** Saved membership and live status have separate sources of truth. */
export const spaceDeviceStore = {
  getState: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  load(root: Uint8Array, me: string) {
    selfId = me;
    loadKnown(root);
    online.clear();
    publish();
  },
  remember,
  refresh(ids: string[]) {
    online = new Set(ids);
    publish();
  },
  clear() {
    known.clear();
    online.clear();
    publish();
  },
};
