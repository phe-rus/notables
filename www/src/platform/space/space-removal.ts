import {
  acceptRotation,
  bytesToHex,
  deriveKey,
  fromBase64,
  hexToBytes,
  newSecret,
  open,
  RoomSocket,
  type RotationNotice,
  readRotationNotice,
  roomOf,
  rotateSpace,
  seal,
  spaceIdOf,
  toBase64,
} from "@notables/sync";
import { useSyncExternalStore } from "react";
import { roomEndpoint } from "../session/room-endpoint";
import { thisDeviceId } from "../session/this-device";
import { adoptSpace, deviceKey, spaceRoot } from "./space-identity";
import {
  HANDOVER_SUFFIX,
  handleRoomNotices,
  knownDevices,
  knownDevicesKey,
  markRemoved,
  rejoinSpaceSync,
} from "./space-sync";

/**
 * Removing a device from the space (spec 0005, AC-12). The device that
 * removes another moves everyone else to a new root secret; it and every
 * device that follows keep a seat in the old room to hand the new secret on
 * to devices that were away, and to tell the removed device. A removed device
 * keeps what it already had, receives nothing new, and starts its own space.
 */

/** A rotation this device still hands on from the room it left. */
interface Handover {
  notice: RotationNotice;
  /** The old room and frame key; the old secret is already known to the removed device. */
  room: string;
  frames: string;
  /** Devices that haven't shown up in the new room yet. */
  waiting: string[];
  /** Removed devices not told yet. */
  untold: string[];
}

const HANDOVERS = "notables:space-handovers";
const REMOVED = "notables:removed-from-space";
/** How long a device keeps handing on a rotation for devices that stay away. */
const HANDOVER_DAYS = 30;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const sockets = new Map<string, RoomSocket>();
const listeners = new Set<() => void>();
let removedNotice: number | null = null;

function readHandovers(): Handover[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HANDOVERS) ?? "[]");
    return Array.isArray(value) ? (value as Handover[]) : [];
  } catch {
    return [];
  }
}

function writeHandovers(list: Handover[]) {
  const fresh = list.filter(
    (item) =>
      (item.waiting.length > 0 || item.untold.length > 0) &&
      Date.now() - item.notice.at < HANDOVER_DAYS * 86_400_000,
  );
  try {
    localStorage.setItem(HANDOVERS, JSON.stringify(fresh));
  } catch {
    // Devices that were away can still be linked again by hand.
  }
  for (const [room, socket] of sockets) {
    if (fresh.some((item) => item.room === room)) continue;
    socket.stop();
    sockets.delete(room);
  }
}

/** Keeps a seat in each old room while someone there still needs the news. */
function serveHandovers() {
  for (const item of readHandovers()) {
    if (sockets.has(item.room)) continue;
    const socket = new RoomSocket(roomEndpoint(), item.room, `${thisDeviceId()}${HANDOVER_SUFFIX}`);
    sockets.set(item.room, socket);
    socket.on("presence", (online) => {
      const list = readHandovers();
      const current = list.find((entry) => entry.room === item.room);
      if (!current) return;
      for (const id of online) {
        if (current.untold.includes(id)) {
          const told = seal(
            hexToBytes(current.frames),
            encoder.encode(JSON.stringify({ from: current.notice.from })),
          );
          if (socket.send(id, `removed:${toBase64(told)}`))
            current.untold = current.untold.filter((other) => other !== id);
        } else if (current.waiting.includes(id)) {
          socket.send(id, `rotate:${JSON.stringify(current.notice)}`);
        }
      }
      writeHandovers(list);
    });
    socket.start();
  }
  writeHandovers(readHandovers());
}

/** Keeps this space's device history, minus the removed devices, under the new space. */
function carryHistory(from: Uint8Array, to: Uint8Array, removed: string[]) {
  try {
    const records = localStorage.getItem(knownDevicesKey(spaceIdOf(from)));
    if (!records) return;
    const kept = (JSON.parse(records) as { id: string }[]).filter(
      (record) => !removed.includes(record.id),
    );
    localStorage.setItem(knownDevicesKey(spaceIdOf(to)), JSON.stringify(kept));
  } catch {
    // Devices reappear in the list when they next connect.
  }
}

/** Moves this device to the new secret and keeps handing it on from the old room. */
async function move(oldRoot: Uint8Array, root: Uint8Array, notice: RotationNotice) {
  const me = thisDeviceId();
  const list = readHandovers();
  list.push({
    notice,
    room: roomOf(oldRoot),
    frames: bytesToHex(deriveKey(oldRoot, "frames")),
    waiting: Object.keys(notice.envelopes).filter((id) => id !== me),
    untold: notice.removed,
  });
  writeHandovers(list);
  carryHistory(oldRoot, root, notice.removed);
  await adoptSpace(root);
  markRemoved(notice.removed);
  rejoinSpaceSync();
  serveHandovers();
}

/** Other devices that can't receive the new secret, because they never sent a key. */
export function devicesWithoutKey(removing: string): string[] {
  return knownDevices()
    .filter((device) => device.id !== removing && !device.key)
    .map((device) => device.name);
}

/** Removes another device from the space and rotates the secret for the rest. */
export async function removeDevice(id: string): Promise<void> {
  const root = spaceRoot();
  const own = deviceKey();
  if (!root || !own) throw new Error("No space");
  const stay = knownDevices().flatMap((device) =>
    device.key && device.id !== id ? [{ id: device.id, key: device.key }] : [],
  );
  const rotation = rotateSpace(root, { id: thisDeviceId(), secret: own.secret }, stay, [id]);
  await move(root, rotation.root, rotation.notice);
}

async function received(from: string, body: string) {
  const root = spaceRoot();
  const own = deviceKey();
  if (!root || !own) return;
  if (body.startsWith("removed:")) {
    const plain = open(deriveKey(root, "frames"), fromBase64(body.slice(8)));
    if (!plain) return;
    const told = JSON.parse(decoder.decode(plain)) as { from?: unknown };
    if (told.from !== spaceIdOf(root)) return;
    // Keep every note here, but nothing new from the space: start a space of this device's own.
    await adoptSpace(newSecret());
    rejoinSpaceSync();
    removedNotice = Date.now();
    try {
      localStorage.setItem(REMOVED, String(removedNotice));
    } catch {
      // The notice shows for this run only.
    }
    for (const listener of listeners) listener();
    return;
  }
  const notice = readRotationNotice(body.slice(7));
  if (!notice || !from.startsWith(notice.by)) return;
  // A device this one already removed can't move it anywhere.
  if (readHandovers().some((item) => item.notice.removed.includes(notice.by))) return;
  const sender = knownDevices().find((device) => device.id === notice.by)?.key;
  const next = acceptRotation(
    notice,
    { id: thisDeviceId(), secret: own.secret },
    spaceIdOf(root),
    sender,
  );
  if (next) await move(root, next, notice);
}

/** Starts listening for removal and handing on rotations; call once the space has started. */
export function startSpaceRemoval() {
  try {
    const stored = Number(localStorage.getItem(REMOVED));
    removedNotice = stored > 0 ? stored : null;
  } catch {
    removedNotice = null;
  }
  markRemoved(readHandovers().flatMap((item) => item.notice.removed));
  handleRoomNotices({
    message: (from, body) => void received(from, body).catch(() => {}),
    presence(online) {
      // A device in the new room has the new secret: stop handing it on.
      const list = readHandovers();
      for (const item of list) item.waiting = item.waiting.filter((id) => !online.includes(id));
      writeHandovers(list);
    },
  });
  serveHandovers();
}

/** When this device was removed from its space by another one, until dismissed. */
export function useRemovedNotice(): number | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => removedNotice,
    () => null,
  );
}

export function dismissRemovedNotice() {
  removedNotice = null;
  try {
    localStorage.removeItem(REMOVED);
  } catch {
    // Already gone.
  }
  for (const listener of listeners) listener();
}
