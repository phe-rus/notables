import {
  deriveKey,
  type LinkSignal,
  LocalLink,
  RelayLink,
  RoomSocket,
  roomOf,
  type SpaceDocs,
  SpacePeer,
} from "@notables/sync";
import { useSyncExternalStore } from "react";
import { devicePlatform } from "../device-platform";
import { openSignal, sealSignal } from "../session/phone-connection";
import { roomEndpoint } from "../session/room-endpoint";
import { thisDeviceId, thisDeviceName } from "../session/this-device";
import { getPersistence, openQuietly, watchOpenDocuments } from "../storage/document-storage";
import { mediaArrived, peerMedia } from "../storage/peer-media";
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
  const signalKey = deriveKey(root, "direct-signals");
  const hello = { name: thisDeviceName(), platform: devicePlatform().os };
  room = new RoomSocket(roomEndpoint(), roomOf(root), me);
  const current = room;

  const connect = (id: string) => {
    if (peers.has(id)) return;
    const link = new RelayLink((body) => current.send(id, body));
    const entry: Connected = {
      link,
      device: null,
      direct: null,
      retry: null,
      peer: null as unknown as SpacePeer,
    };
    entry.peer = new SpacePeer(key, docs, hello, (info) => {
      entry.device = { id, ...info };
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
    if (entry.retry) clearTimeout(entry.retry);
    const direct = entry.direct;
    entry.direct = null;
    direct?.close();
    entry.peer.detach();
  };

  current.on("presence", (online) => {
    for (const id of online) if (id !== me) connect(id);
    for (const [id, entry] of peers) {
      if (online.includes(id)) continue;
      peers.delete(id);
      dispose(entry);
    }
    changed();
  });
  current.on("message", ({ from, body }) => {
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
