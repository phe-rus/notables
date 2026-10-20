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
import { devicePlatform } from "../device-platform";
import { openSignal, sealSignal } from "../session/phone-connection";
import { roomEndpoint } from "../session/room-endpoint";
import { thisDeviceId, thisDeviceName } from "../session/this-device";
import { getPersistence, openQuietly, watchOpenDocuments } from "../storage/document-storage";
import { mediaArrived, peerMedia } from "../storage/peer-media";
import { spaceDeviceStore } from "./space-device-store";
import { deviceKey, spaceRoot } from "./space-identity";
import { removedFor } from "./space-membership";
import type { Connected, NoteIds, RoomNotices } from "./types";

/** The seat a device keeps in a room it left, to hand on a rotated secret. */
export const HANDOVER_SUFFIX = "-handover";

let notices: RoomNotices | null = null;

export function handleRoomNotices(handler: RoomNotices) {
  notices = handler;
}

let room: RoomSocket | null = null;
let lastNoteIds: NoteIds | null = null;
let stopResuming: (() => void) | null = null;
let stopWatching: (() => void) | null = null;
const peers = new Map<string, Connected>();
const opened = new Set<string>();
function changed() {
  spaceDeviceStore.refresh(
    [...peers.values()].flatMap(({ device }) => (device ? [device.id] : [])),
  );
}

/**
 * Keeps this device in step with the space's other devices while it runs
 * (spec 0005, step 6). They meet in the space's room, named from its
 * secret; frames are sealed with the space's frame key, so the room passes
 * ciphertext between device ids and stores nothing. Local links replace
 * the relay when available and survive a lost room connection.
 */
export function startSpaceSync(noteIds: NoteIds) {
  lastNoteIds = noteIds;
  const root = spaceRoot();
  if (!root || room) return;
  const removedHere = removedFor(root);
  spaceDeviceStore.load(root, thisDeviceId());
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
      relayTimer: null,
      peer: null as unknown as SpacePeer,
    };
    entry.peer = new SpacePeer(key, docs, hello, (info) => {
      if (removedHere.has(id)) return;
      entry.device = { id, ...info, online: true, lastSeen: Date.now() };
      spaceDeviceStore.remember(entry.device);
      changed();
    });
    entry.peer.shareMedia(peerMedia, mediaArrived);
    peers.set(id, entry);
    if (typeof RTCPeerConnection === "undefined") entry.peer.attach(link);
    else
      entry.relayTimer = setTimeout(() => {
        entry.relayTimer = null;
        if (peers.get(id) === entry && !entry.direct?.isOpen && current.open)
          entry.peer.attach(link);
      }, 8000);
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
      if (entry.direct === link) {
        if (entry.relayTimer) clearTimeout(entry.relayTimer);
        entry.relayTimer = null;
        entry.peer.attach(link);
      }
    });
    link.on("data", (data) => entry.peer.receive(data));
    link.on("close", () => {
      if (entry.direct !== link) return;
      entry.direct = null;
      if (peers.get(id) !== entry) return;
      if (!current.open || !current.online.includes(id)) {
        peers.delete(id);
        dispose(entry);
        changed();
        return;
      }
      if (entry.relayTimer) clearTimeout(entry.relayTimer);
      entry.relayTimer = null;
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
    if (entry.device)
      spaceDeviceStore.remember({ ...entry.device, online: false, lastSeen: Date.now() });
    if (entry.retry) clearTimeout(entry.retry);
    if (entry.relayTimer) clearTimeout(entry.relayTimer);
    const direct = entry.direct;
    entry.direct = null;
    direct?.close();
    entry.peer.detach();
  };

  current.on("presence", (online) => {
    notices?.presence(online);
    for (const id of online) if (id !== me && !removedHere.has(id)) connect(id);
    for (const [id, entry] of peers) {
      if (online.includes(id) || entry.direct?.isOpen) continue;
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
    for (const [id, entry] of peers) {
      if (entry.direct?.isOpen) continue;
      peers.delete(id);
      dispose(entry);
    }
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
  const resume = () => {
    if (document.visibilityState === "visible") current.reconnect();
  };
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  window.addEventListener("notables:local-network-ready", resume);
  stopResuming = () => {
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("notables:local-network-ready", resume);
  };
  current.start();
}

/** Leaves the room: before joining another space, or when the app closes. */
export function stopSpaceSync() {
  stopResuming?.();
  stopResuming = null;
  for (const entry of peers.values()) {
    if (entry.retry) clearTimeout(entry.retry);
    if (entry.relayTimer) clearTimeout(entry.relayTimer);
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
  spaceDeviceStore.clear();
}

/** Joins the space this device was just linked to; its own notes come along. */
export function rejoinSpaceSync() {
  stopSpaceSync();
  if (lastNoteIds) startSpaceSync(lastNoteIds);
}
