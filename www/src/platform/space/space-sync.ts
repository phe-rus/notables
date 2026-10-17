import {
  deriveKey,
  type LinkSignal,
  LocalLink,
  RelayLink,
  RoomSocket,
  roomOf,
  type SpaceDocs,
  SpacePeer,
  spaceIdOf,
} from "@notables/sync";
import { useSyncExternalStore } from "react";
import { devicePlatform } from "../device-platform";
import { openSignal, sealSignal } from "../session/phone-connection";
import { roomEndpoint } from "../session/room-endpoint";
import { thisDeviceId, thisDeviceName } from "../session/this-device";
import { getPersistence, openQuietly, watchOpenDocuments } from "../storage/document-storage";
import { mediaArrived, peerMedia } from "../storage/peer-media";
import { deviceKey, spaceRoot } from "./space-identity";

/** Another device of the space, as this one sees it right now. */
export interface SpaceDevice {
  id: string;
  name: string;
  platform: string;
  online: boolean;
  lastSeen: number;
  /** Its X25519 public key, kept from the first hello (AC-12). */
  key?: string;
}

/** Messages about removal that pass through the space's room (AC-12). */
export interface RoomNotices {
  message(from: string, body: string): void;
  /** Devices now in this space's room. */
  presence(online: string[]): void;
}

/** The seat a device keeps in a room it left, to hand on a rotated secret. */
export const HANDOVER_SUFFIX = "-handover";

let notices: RoomNotices | null = null;

export function handleRoomNotices(handler: RoomNotices) {
  notices = handler;
}

/** Every note id the library still knows; the app supplies it. */
type NoteIds = () => Promise<string[]>;

interface Connected {
  peer: SpacePeer;
  link: RelayLink;
  device: SpaceDevice | null;
  direct: LocalLink | null;
  retry: ReturnType<typeof setTimeout> | null;
}

let room: RoomSocket | null = null;
let lastNoteIds: NoteIds | null = null;
let stopWatching: (() => void) | null = null;
const peers = new Map<string, Connected>();
const opened = new Set<string>();
const listeners = new Set<() => void>();
let snapshot: SpaceDevice[] = [];
let historyKey = "";
const known = new Map<string, SpaceDevice>();

export const knownDevicesKey = (spaceId: string) => `notables:known-devices:${spaceId}`;

function remember(device: SpaceDevice) {
  // The first key seen stays: a later hello can't swap in another (trust on first use).
  known.set(device.id, { ...device, key: known.get(device.id)?.key ?? device.key });
  try {
    localStorage.setItem(historyKey, JSON.stringify([...known.values()]));
  } catch {
    /* Live status still works. */
  }
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

function changed() {
  const online = new Set([...peers.values()].flatMap(({ device }) => (device ? [device.id] : [])));
  snapshot = [...known.values()]
    .filter((device) => device.id !== thisDeviceId())
    .map((device) => ({ ...device, online: online.has(device.id) }))
    .sort((a, b) => Number(b.online) - Number(a.online) || b.lastSeen - a.lastSeen);
  for (const listener of listeners) listener();
}

/**
 * Keeps this device in step with the space's other devices while it runs
 * (spec 0005, step 6). They meet in the space's room, named from its
 * secret; frames are sealed with the space's frame key, so the room passes
 * ciphertext between device ids and stores nothing. This first rung relays
 * through the room; direct links on the same network come next.
 */
export function startSpaceSync(noteIds: NoteIds) {
  lastNoteIds = noteIds;
  const root = spaceRoot();
  if (!root || room) return;
  loadKnown(root);
  changed();
  const docs: SpaceDocs = {
    open: openQuietly,
    remove: (name) => getPersistence().remove(name),
    notes: async () => (await noteIds()).map((id) => `note:${id}`),
  };
  const key = deriveKey(root, "frames");
  const me = thisDeviceId();
  const signalKey = deriveKey(root, "direct-signals");
  const hello = {
    name: thisDeviceName(),
    platform: devicePlatform().os,
    key: deviceKey()?.publicKey,
  };
  room = new RoomSocket(roomEndpoint(), roomOf(root), me);
  const current = room;

  const connect = (id: string) => {
    if (peers.has(id) || id.endsWith(HANDOVER_SUFFIX)) return;
    const link = new RelayLink((body) => current.send(id, body));
    const entry: Connected = {
      link,
      device: null,
      direct: null,
      retry: null,
      peer: null as unknown as SpacePeer,
    };
    entry.peer = new SpacePeer(key, docs, hello, (info) => {
      if (removedHere.has(id)) return;
      entry.device = { id, ...info, online: true, lastSeen: Date.now() };
      remember(entry.device);
      changed();
    });
    entry.peer.shareMedia(peerMedia, mediaArrived);
    peers.set(id, entry);
    entry.peer.attach(link);
    for (const name of opened) entry.peer.pin(name);
    if (me < id) connectDirect(id, entry);
  };

  const connectDirect = (id: string, entry: Connected, signal?: LinkSignal) => {
    if (entry.direct || typeof RTCPeerConnection === "undefined") return;
    const link = new LocalLink((message) =>
      current.send(id, `local:${sealSignal(signalKey, message)}`),
    );
    entry.direct = link;
    link.on("open", () => {
      if (entry.direct === link) entry.peer.attach(link);
    });
    link.on("data", (data) => entry.peer.receive(data));
    link.on("close", () => {
      if (entry.direct !== link) return;
      entry.direct = null;
      if (peers.get(id) !== entry) return;
      entry.peer.attach(entry.link);
      if (me < id)
        entry.retry = setTimeout(() => {
          entry.retry = null;
          if (peers.get(id) === entry) connectDirect(id, entry);
        }, 10000);
    });
    const timeout = setTimeout(() => {
      if (!link.isOpen) link.close();
    }, 12000);
    link.on("open", () => clearTimeout(timeout));
    link.on("close", () => clearTimeout(timeout));
    void (signal ? link.receive(signal) : link.call()).catch(() => link.close());
  };
  const dispose = (entry: Connected) => {
    if (entry.device) remember({ ...entry.device, online: false, lastSeen: Date.now() });
    if (entry.retry) clearTimeout(entry.retry);
    const direct = entry.direct;
    entry.direct = null;
    direct?.close();
    entry.peer.detach();
  };

  current.on("presence", (online) => {
    notices?.presence(online);
    for (const id of online) if (id !== me && !removedHere.has(id)) connect(id);
    for (const [id, entry] of peers) {
      if (online.includes(id)) continue;
      peers.delete(id);
      dispose(entry);
    }
    changed();
  });
  current.on("message", ({ from, body }) => {
    if (body.startsWith("rotate:") || body.startsWith("removed:")) {
      notices?.message(from, body);
      return;
    }
    if (removedHere.has(from)) return;
    if (!peers.has(from)) connect(from);
    const entry = peers.get(from);
    if (entry && body.startsWith("local:")) {
      const signal = openSignal(signalKey, body.slice(6));
      if (
        signal &&
        (signal.kind === "offer" || signal.kind === "answer") &&
        typeof signal.sdp === "string" &&
        signal.sdp.length < 256000
      ) {
        if (!entry.direct && signal.kind === "offer") connectDirect(from, entry, signal);
        else void entry.direct?.receive(signal).catch(() => {});
      }
      return;
    }
    const frame = entry?.link.receive(body);
    if (entry && frame) entry.peer.receive(frame);
  });
  current.on("close", () => {
    for (const entry of peers.values()) dispose(entry);
    peers.clear();
    changed();
  });
  stopWatching = watchOpenDocuments({
    opened(name) {
      if (!name.startsWith("note:")) return;
      opened.add(name);
      for (const { peer } of peers.values()) peer.pin(name);
    },
    closed(name) {
      opened.delete(name);
      for (const { peer } of peers.values()) peer.unpin(name);
    },
  });
  current.start();
}

/** Leaves the room: before joining another space, or when the app closes. */
export function stopSpaceSync() {
  for (const entry of peers.values()) {
    if (entry.retry) clearTimeout(entry.retry);
    const direct = entry.direct;
    entry.direct = null;
    direct?.close();
    entry.peer.detach();
  }
  peers.clear();
  stopWatching?.();
  stopWatching = null;
  room?.stop();
  room = null;
  known.clear();
  changed();
}

/** Joins the space this device was just linked to; its own notes come along. */
export function rejoinSpaceSync() {
  stopSpaceSync();
  if (lastNoteIds) startSpaceSync(lastNoteIds);
}

/** Devices removed from this space, which it never syncs with again. */
const removedHere = new Set<string>();

export function markRemoved(ids: string[]) {
  for (const id of ids) removedHere.add(id);
}

/** Every other device this one has met in its space, with the key each announced. */
export function knownDevices(): SpaceDevice[] {
  return snapshot;
}

/** The space's other devices that are online now. */
export function useSpaceDevices(): SpaceDevice[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
}
