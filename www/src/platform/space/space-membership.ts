import { spaceIdOf } from "@notables/sync";
import { thisDeviceId } from "../session/this-device";
import { spaceDeviceStore } from "./space-device-store";
import { spaceRoot } from "./space-identity";
import type { PairedDevice } from "./types";

/** Removal belongs to one space, not every space this installation may join. */
const removedBySpace = new Map<string, Set<string>>();

export function removedFor(root: Uint8Array): Set<string> {
  const id = spaceIdOf(root);
  let removed = removedBySpace.get(id);
  if (!removed) {
    removed = new Set<string>();
    removedBySpace.set(id, removed);
  }
  return removed;
}

const approvedDevicesKey = (root: Uint8Array) => `notables:paired-devices:${spaceIdOf(root)}`;

function approvedDevices(root: Uint8Array): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(approvedDevicesKey(root)) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function markRemoved(ids: string[]) {
  const root = spaceRoot();
  if (!root) return;
  const approved = approvedDevices(root);
  const removed = removedFor(root);
  for (const id of ids) if (!approved.has(id)) removed.add(id);
}

/** Only call after the authenticated pairing exchange has been saved and acknowledged. */
export function rememberPairedDevice(device: PairedDevice) {
  const root = spaceRoot();
  if (!root || device.id === thisDeviceId()) return;
  removedFor(root).delete(device.id);
  const approved = approvedDevices(root);
  approved.add(device.id);
  localStorage.setItem(approvedDevicesKey(root), JSON.stringify([...approved]));
  spaceDeviceStore.remember({ ...device, online: false, lastSeen: Date.now() }, true);
}
