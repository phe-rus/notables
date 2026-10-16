import {
  fromBase64,
  type LinkSignal,
  LocalLink,
  open,
  RoomSocket,
  roomOf,
  SessionClient,
  seal,
  toBase64,
} from "@notables/sync";
import { useSyncExternalStore } from "react";
import { showPhoneSpace } from "../space/space-identity";
import { type BrowserSession, browserSession, clearBrowserSession } from "./browser-session-store";
import { roomEndpoint } from "./room-endpoint";
import { thisDeviceName } from "./this-device";

/**
 * How the browser's link to its phone is doing:
 * - `connecting`: finding the phone;
 * - `connected`: notes flow directly over the local network;
 * - `phone-away`: the phone isn't reachable (closed, asleep, or Stop);
 * - `other-network`: the phone is there, but not on this network;
 * - `ended`: the phone ended this session.
 */
export type PhoneStatus = "connecting" | "connected" | "phone-away" | "other-network" | "ended";

/** What the room carries between the two: the link's offer and answer, and goodbyes. Sealed. */
export type SessionSignal = LinkSignal | { kind: "ended" };

/** How long a local connection may take to form before the phone counts as elsewhere. */
const LOCAL_TIMEOUT = 12_000;
const RETRY = 8000;

const text = new TextEncoder();
const read = new TextDecoder();

export function sealSignal(key: Uint8Array, signal: SessionSignal): string {
  return toBase64(seal(key, text.encode(JSON.stringify(signal))));
}

export function openSignal(key: Uint8Array, body: string): SessionSignal | null {
  try {
    const plain = open(key, fromBase64(body));
    return plain ? (JSON.parse(read.decode(plain)) as SessionSignal) : null;
  } catch {
    return null;
  }
}

/** The browser's side: finds its phone in their room and keeps a local link to it open. */
class PhoneConnection {
  readonly client: SessionClient;
  readonly #room: RoomSocket;
  #link: LocalLink | null = null;
  #status: PhoneStatus = "connecting";
  #listeners = new Set<() => void>();
  #retry: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly session: BrowserSession) {
    this.client = new SessionClient(session.key, (message) => {
      const space = message as { type?: string; code?: string };
      if (space.type === "space" && typeof space.code === "string") showPhoneSpace(space.code);
    });
    this.#room = new RoomSocket(roomEndpoint(), roomOf(session.key), session.browserId);
    this.#room.on("presence", (online) => this.#onPresence(online));
    this.#room.on("message", ({ from, body }) => {
      if (from !== session.phoneId) return;
      const signal = openSignal(session.key, body);
      if (!signal) return;
      if (signal.kind === "ended") {
        this.#end();
        return;
      }
      void this.#link?.receive(signal).catch(() => {});
    });
    this.#room.start();
  }

  get status(): PhoneStatus {
    return this.#status;
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getStatus = () => this.#status;

  /** Log Out from the browser: tell the phone, then forget the session. */
  logOut() {
    this.#room.send(this.session.phoneId, sealSignal(this.session.key, { kind: "ended" }));
    this.#end();
  }

  #onPresence(online: string[]) {
    const here = online.includes(this.session.phoneId);
    if (!here) {
      this.#link?.close();
      if (this.#status !== "ended") this.#set("phone-away");
      return;
    }
    if (!this.#link) this.#call();
  }

  #call() {
    if (this.#retry) clearTimeout(this.#retry);
    this.#retry = null;
    const { key, phoneId } = this.session;
    const link = new LocalLink((signal) => this.#room.send(phoneId, sealSignal(key, signal)));
    this.#link = link;
    if (this.#status !== "connected") this.#set("connecting");
    const timeout = setTimeout(() => {
      if (link.isOpen) return;
      this.#set("other-network");
      link.close();
    }, LOCAL_TIMEOUT);
    link.on("open", () => {
      clearTimeout(timeout);
      this.client.attach({ send: (data) => void link.send(data) });
      this.client.sendControl({ type: "hello", name: thisDeviceName() });
      this.#set("connected");
    });
    link.on("data", (data) => this.client.receive(data));
    link.on("close", () => {
      clearTimeout(timeout);
      if (this.#link !== link) return;
      this.#link = null;
      this.client.detach();
      if (this.#status === "connected") this.#set("connecting");
      // Try again while the phone is still in the room.
      this.#retry = setTimeout(() => {
        if (this.#room.online.includes(phoneId) && !this.#link) this.#call();
      }, RETRY);
    });
    void link.call().catch(() => link.close());
  }

  #end() {
    this.#room.stop();
    this.#link?.close();
    clearBrowserSession();
    this.#set("ended");
  }

  #set(status: PhoneStatus) {
    if (status === this.#status) return;
    this.#status = status;
    for (const listener of this.#listeners) listener();
  }
}

let connection: PhoneConnection | null = null;

/** The browser's connection to its phone, started on first use; null outside a session. */
export function phoneConnection(): PhoneConnection | null {
  if (connection) return connection;
  const session = browserSession();
  if (!session) return null;
  connection = new PhoneConnection(session);
  return connection;
}

export function usePhoneStatus(): PhoneStatus | null {
  const current = phoneConnection();
  return useSyncExternalStore(current?.subscribe ?? noop, current?.getStatus ?? none, none);
}

const noop = () => () => {};
const none = () => null;
