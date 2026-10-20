import {
  bytesToHex,
  type DocSource,
  hexToBytes,
  LocalLink,
  RoomSocket,
  roomOf,
  SessionHost,
  spaceCode,
  spaceIdOf,
} from "@notables/sync";
import { useSyncExternalStore } from "react";
import * as Y from "yjs";
import { openSignal, sealSignal } from "@/platform/session/phone-connection";
import { roomEndpoint } from "@/platform/session/room-endpoint";
import { thisDeviceId } from "@/platform/session/this-device";
import { spaceRoot } from "@/platform/space/space-identity";
import { getPersistence } from "@/platform/storage/document-storage";
import { mediaArrived, peerMedia } from "@/platform/storage/peer-media";

/** A browser this phone has approved (spec 0005, AC-22). Its key never leaves the phone otherwise. */
export interface BrowserSessionRecord {
  id: string;
  name: string;
  key: string;
  pairedAt: number;
  lastActive: number;
}

const KEY = "notables:browser-sessions";

function load(): BrowserSessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as BrowserSessionRecord[];
  } catch {
    return [];
  }
}

let records: BrowserSessionRecord[] = [];
const listeners = new Set<() => void>();
/** Which browsers are open on this phone right now. */
const live = new Set<string>();
let liveSnapshot: ReadonlySet<string> = new Set();

function save(next: BrowserSessionRecord[]) {
  records = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept until the app closes.
  }
  for (const listener of listeners) listener();
}

function setLive(id: string, on: boolean) {
  if (on) live.add(id);
  else live.delete(id);
  liveSnapshot = new Set(live);
  for (const listener of listeners) listener();
}

/** The phone's documents for a browser: the open copy if there is one, else from storage. */
const phoneDocs: DocSource = {
  async open(name) {
    const doc = new Y.Doc();
    const binding = await getPersistence().bind(name, doc);
    return {
      doc,
      release: () => {
        binding.destroy();
        doc.destroy();
      },
    };
  },
  remove: (name) => getPersistence().remove(name),
};

/** Serves one browser: waits in their room for it to call, then answers over the local network. */
class ServedBrowser {
  readonly #room: RoomSocket;
  readonly #host: SessionHost;
  readonly #key: Uint8Array;
  #link: LocalLink | null = null;
  #stopped = false;

  constructor(private readonly record: BrowserSessionRecord) {
    this.#key = hexToBytes(record.key);
    this.#host = new SessionHost(this.#key, phoneDocs, (message) => {
      const hello = message as { type?: string; name?: string };
      if (hello.type !== "hello") return;
      touch(record.id, hello.name);
      // The browser shows which space it is a window onto.
      const space = spaceRoot();
      if (space) this.#host.sendControl({ type: "space", code: spaceCode(spaceIdOf(space)) });
    });
    this.#host.shareMedia(peerMedia, mediaArrived);
    this.#host.handleRequests(async (method, input) => {
      const { browserShareRequest } = await import("@/features/sharing/lib/browser-share-request");
      return browserShareRequest(method, input);
    });
    this.#room = new RoomSocket(roomEndpoint(), roomOf(this.#key), thisDeviceId());
    this.#room.on("message", ({ from, body }) => {
      if (from !== record.id) return;
      const signal = openSignal(this.#key, body);
      if (!signal) return;
      if (signal.kind === "ended") {
        forget(record.id);
        return;
      }
      if (signal.kind === "offer") this.#answer(signal.sdp);
    });
    this.#room.on("presence", (online) => {
      if (!online.includes(record.id)) this.#link?.close();
    });
    this.#room.start();
  }

  #answer(sdp: string) {
    if (this.#stopped) return;
    this.#link?.close();
    const link = new LocalLink((signal) =>
      this.#room.send(this.record.id, sealSignal(this.#key, signal)),
    );
    this.#link = link;
    link.on("open", () => {
      this.#host.attach(link);
      setLive(this.record.id, true);
    });
    link.on("data", (data) => this.#host.receive(data));
    link.on("close", () => {
      if (this.#link !== link) return;
      this.#link = null;
      this.#host.detach();
      setLive(this.record.id, false);
    });
    void link.receive({ kind: "offer", sdp }).catch(() => link.close());
  }

  /** Ends the session: the browser is told, forgets its key, and gets nothing more. */
  end() {
    this.#room.send(this.record.id, sealSignal(this.#key, { kind: "ended" }));
    this.stop();
  }

  stop() {
    this.#stopped = true;
    this.#link?.close();
    this.#host.detach();
    // Let the goodbye go out before the seat closes.
    setTimeout(() => this.#room.stop(), 500);
    setLive(this.record.id, false);
  }
}

const served = new Map<string, ServedBrowser>();

function touch(id: string, name?: string) {
  save(
    records.map((record) =>
      record.id === id ? { ...record, name: name || record.name, lastActive: Date.now() } : record,
    ),
  );
}

function forget(id: string) {
  served.get(id)?.stop();
  served.delete(id);
  save(records.filter((record) => record.id !== id));
}

/** Starts serving every approved browser. Native apps only; safe to call again. */
export function startBrowserSessions() {
  records = load();
  for (const listener of listeners) listener();
  for (const record of records) {
    if (!served.has(record.id)) served.set(record.id, new ServedBrowser(record));
  }
}

/** Pause serving without forgetting approval, including during a required update. */
export function pauseBrowserSessions() {
  for (const browser of served.values()) browser.stop();
  served.clear();
}

/** A browser the person just approved. */
export function addBrowserSession(browserId: string, sessionKey: Uint8Array) {
  const now = Date.now();
  const record: BrowserSessionRecord = {
    id: browserId,
    name: "",
    key: bytesToHex(sessionKey),
    pairedAt: now,
    lastActive: now,
  };
  save([...records.filter((existing) => existing.id !== browserId), record]);
  served.get(browserId)?.stop();
  served.set(browserId, new ServedBrowser(record));
}

export function endBrowserSession(id: string) {
  served.get(id)?.end();
  served.delete(id);
  save(records.filter((record) => record.id !== id));
}

export function endAllBrowserSessions() {
  for (const id of [...records.map((record) => record.id)]) endBrowserSession(id);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useBrowserSessions = () =>
  useSyncExternalStore(
    subscribe,
    () => records,
    () => records,
  );

export const useLiveBrowsers = () =>
  useSyncExternalStore(
    subscribe,
    () => liveSnapshot,
    () => liveSnapshot,
  );
