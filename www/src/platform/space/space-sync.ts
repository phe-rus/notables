import {
  deriveKey,
  RelayLink,
  RoomSocket,
  roomOf,
  type SpaceDocs,
  SpacePeer,
} from "@notables/sync";
import { useSyncExternalStore } from "react";
import { devicePlatform } from "../device-platform";
import { roomEndpoint } from "../session/room-endpoint";
import { thisDeviceId, thisDeviceName } from "../session/this-device";
import { getPersistence, openQuietly, watchOpenDocuments } from "../storage/document-storage";
import { spaceRoot } from "./space-identity";

/** Another device of the space, as this one sees it right now. */
export interface SpaceDevice {
  id: string;
  name: string;
  platform: string;
}

/** Every note id the library still knows; the app supplies it. */
type NoteIds = () => Promise<string[]>;

interface Connected {
  peer: SpacePeer;
  link: RelayLink;
  device: SpaceDevice | null;
}

let room: RoomSocket | null = null;
let lastNoteIds: NoteIds | null = null;
let stopWatching: (() => void) | null = null;
const peers = new Map<string, Connected>();
const opened = new Set<string>();
const listeners = new Set<() => void>();
let snapshot: SpaceDevice[] = [];

function changed() {
  snapshot = [...peers.values()].flatMap(({ device }) => (device ? [device] : []));
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
  const docs: SpaceDocs = {
    open: openQuietly,
    remove: (name) => getPersistence().remove(name),
    notes: async () => (await noteIds()).map((id) => `note:${id}`),
  };
  const key = deriveKey(root, "frames");
  const me = thisDeviceId();
  const hello = { name: thisDeviceName(), platform: devicePlatform().os };
  room = new RoomSocket(roomEndpoint(), roomOf(root), me);
  const current = room;

  const connect = (id: string) => {
    if (peers.has(id)) return;
    const link = new RelayLink((body) => current.send(id, body));
    const entry: Connected = { link, device: null, peer: null as unknown as SpacePeer };
    entry.peer = new SpacePeer(key, docs, hello, (info) => {
      entry.device = { id, ...info };
      changed();
    });
    peers.set(id, entry);
    entry.peer.attach(link);
    for (const name of opened) entry.peer.pin(name);
  };

  current.on("presence", (online) => {
    for (const id of online) if (id !== me) connect(id);
    for (const [id, entry] of peers) {
      if (online.includes(id)) continue;
      entry.peer.detach();
      peers.delete(id);
    }
    changed();
  });
  current.on("message", ({ from, body }) => {
    if (!peers.has(from)) connect(from);
    const entry = peers.get(from);
    const frame = entry?.link.receive(body);
    if (entry && frame) entry.peer.receive(frame);
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
  for (const { peer } of peers.values()) peer.detach();
  peers.clear();
  stopWatching?.();
  stopWatching = null;
  room?.stop();
  room = null;
  changed();
}

/** Joins the space this device was just linked to; its own notes come along. */
export function rejoinSpaceSync() {
  stopSpaceSync();
  if (lastNoteIds) startSpaceSync(lastNoteIds);
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
