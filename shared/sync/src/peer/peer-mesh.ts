import type { Awareness } from "y-protocols/awareness";
import { removeAwarenessStates } from "y-protocols/awareness";
import type * as Y from "yjs";
import { Emitter } from "../lib/typed-emitter";
import {
  awarenessMessage,
  type ControlMessage,
  type Hello,
  readMessage,
  syncStep1,
  updateMessage,
} from "./peer-protocol";

/** What travels through the signalling service between two devices. */
export type SignalData =
  | { kind: "announce" }
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "bye" };

export interface Signal {
  from: string;
  data: SignalData;
}

/**
 * Introduces devices to each other. It only carries connection offers;
 * notes travel directly between devices once they're connected.
 */
export interface Signaling {
  send(to: string | null, data: SignalData): Promise<void>;
  subscribe(onSignal: (signal: Signal) => void): () => void;
}

export interface PeerAuth {
  /** How this device introduces itself. */
  hello: Hello;
  /** Whether another device may sync; a string explains a refusal. */
  verify(hello: Hello): Promise<true | string> | true | string;
}

export interface ConnectedPeer {
  id: string;
  name: string;
  inviteId: string;
}

interface Peer {
  id: string;
  connection: RTCPeerConnection;
  channel: RTCDataChannel | null;
  /** Set once the other device has shown it was invited. */
  hello: Hello | null;
  /** Awareness clients it introduced, removed when it leaves. */
  clients: Set<number>;
}

type Events = { peers: (peers: ConnectedPeer[]) => void };

const ANNOUNCE_EVERY = 12_000;
const GATHER_TIMEOUT = 4000;

export const defaultIceServers: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

/** Waits for ICE gathering, so one offer or answer carries every candidate. */
function gathered(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      connection.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => connection.iceGatheringState === "complete" && done();
    connection.addEventListener("icegatheringstatechange", check);
    setTimeout(done, GATHER_TIMEOUT);
  });
}

/**
 * Keeps one document in sync with every other device that holds it,
 * directly over WebRTC data channels. Devices find each other through
 * `signaling`; each must prove it was invited before any content moves.
 */
export class PeerMesh extends Emitter<Events> {
  #peers = new Map<string, Peer>();
  #unsubscribe: (() => void) | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;
  #stopped = false;

  constructor(
    readonly selfId: string,
    private readonly doc: Y.Doc,
    private readonly awareness: Awareness,
    private readonly signaling: Signaling,
    private readonly auth: PeerAuth,
    private readonly iceServers: RTCIceServer[] = defaultIceServers,
  ) {
    super();
  }

  get peers(): ConnectedPeer[] {
    return [...this.#peers.values()]
      .filter((peer) => peer.hello && peer.channel?.readyState === "open")
      .map((peer) => ({
        id: peer.id,
        name: peer.hello?.name ?? "",
        inviteId: peer.hello?.inviteId ?? "",
      }));
  }

  start() {
    if (this.#unsubscribe) return;
    this.#unsubscribe = this.signaling.subscribe((signal) => void this.#onSignal(signal));
    this.doc.on("update", this.#onDocUpdate);
    this.awareness.on("update", this.#onAwarenessUpdate);
    const announce = () => void this.signaling.send(null, { kind: "announce" }).catch(() => {});
    announce();
    this.#timer = setInterval(announce, ANNOUNCE_EVERY);
  }

  stop() {
    this.#stopped = true;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    if (this.#timer) clearInterval(this.#timer);
    this.doc.off("update", this.#onDocUpdate);
    this.awareness.off("update", this.#onAwarenessUpdate);
    void this.signaling.send(null, { kind: "bye" }).catch(() => {});
    for (const peer of [...this.#peers.values()]) this.#drop(peer);
  }

  /** Ends the connection with a device, e.g. one whose invitation was withdrawn. */
  disconnect(inviteId: string) {
    for (const peer of [...this.#peers.values()]) {
      if (peer.hello?.inviteId === inviteId) this.#drop(peer);
    }
  }

  async #onSignal({ from, data }: Signal) {
    if (this.#stopped || from === this.selfId) return;
    const existing = this.#peers.get(from);
    switch (data.kind) {
      case "announce":
        // The device with the smaller id calls; the other answers.
        if (!existing && this.selfId < from) await this.#call(from);
        else if (!existing) void this.signaling.send(from, { kind: "announce" }).catch(() => {});
        break;
      case "offer":
        if (existing) this.#drop(existing);
        await this.#answer(from, data.sdp);
        break;
      case "answer":
        if (existing && existing.connection.signalingState === "have-local-offer") {
          await existing.connection.setRemoteDescription({ type: "answer", sdp: data.sdp });
        }
        break;
      case "bye":
        if (existing) this.#drop(existing);
        break;
    }
  }

  #open(id: string): Peer {
    const connection = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: Peer = { id, connection, channel: null, hello: null, clients: new Set() };
    this.#peers.set(id, peer);
    connection.addEventListener("connectionstatechange", () => {
      if (connection.connectionState === "failed" || connection.connectionState === "closed") {
        this.#drop(peer);
      }
    });
    return peer;
  }

  async #call(id: string) {
    const peer = this.#open(id);
    this.#attach(peer, peer.connection.createDataChannel("notables", { ordered: true }));
    await peer.connection.setLocalDescription(await peer.connection.createOffer());
    await gathered(peer.connection);
    const sdp = peer.connection.localDescription?.sdp;
    if (sdp && this.#peers.get(id) === peer) await this.signaling.send(id, { kind: "offer", sdp });
  }

  async #answer(id: string, offer: string) {
    const peer = this.#open(id);
    peer.connection.addEventListener("datachannel", (event) => this.#attach(peer, event.channel));
    await peer.connection.setRemoteDescription({ type: "offer", sdp: offer });
    await peer.connection.setLocalDescription(await peer.connection.createAnswer());
    await gathered(peer.connection);
    const sdp = peer.connection.localDescription?.sdp;
    if (sdp && this.#peers.get(id) === peer) await this.signaling.send(id, { kind: "answer", sdp });
  }

  #attach(peer: Peer, channel: RTCDataChannel) {
    peer.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.addEventListener("open", () => channel.send(JSON.stringify(this.auth.hello)));
    channel.addEventListener("close", () => this.#drop(peer));
    channel.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        void this.#onControl(peer, JSON.parse(event.data) as ControlMessage);
      } else if (peer.hello) {
        // The peer is the origin, so its changes aren't echoed back to it.
        const reply = readMessage(new Uint8Array(event.data), this.doc, this.awareness, peer);
        if (reply) this.#send(peer, reply);
      }
    });
  }

  async #onControl(peer: Peer, message: ControlMessage) {
    if (message.type === "rejected") {
      this.#drop(peer);
      return;
    }
    const verdict = await this.auth.verify(message);
    if (this.#peers.get(peer.id) !== peer) return;
    if (verdict !== true) {
      peer.channel?.send(JSON.stringify({ type: "rejected", reason: verdict }));
      this.#drop(peer);
      return;
    }
    peer.hello = message;
    // Exchange what each side has, then keep each other up to date.
    this.#send(peer, syncStep1(this.doc));
    this.#send(peer, awarenessMessage(this.awareness, [this.doc.clientID]));
    this.emit("peers", this.peers);
  }

  #send(peer: Peer, data: Uint8Array) {
    if (peer.channel?.readyState === "open") peer.channel.send(data as Uint8Array<ArrayBuffer>);
  }

  /**
   * Passes every change on, including ones from other peers, so devices
   * that couldn't connect to each other directly still stay in step.
   */
  #onDocUpdate = (update: Uint8Array, origin: unknown) => {
    const message = updateMessage(update);
    for (const peer of this.#peers.values()) {
      if (peer.hello && peer !== origin) this.#send(peer, message);
    }
  };

  #onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    const from = [...this.#peers.values()].find((peer) => peer === origin);
    if (from) {
      // Remember who each device brought, to clear them when it leaves.
      for (const client of [...added, ...updated]) from.clients.add(client);
      for (const client of removed) from.clients.delete(client);
      return;
    }
    if (origin === this) return;
    const message = awarenessMessage(this.awareness, [...added, ...updated, ...removed]);
    for (const peer of this.#peers.values()) if (peer.hello) this.#send(peer, message);
  };

  #drop(peer: Peer) {
    if (this.#peers.get(peer.id) !== peer) return;
    this.#peers.delete(peer.id);
    try {
      peer.channel?.close();
      peer.connection.close();
    } catch {
      // Already closed.
    }
    if (peer.clients.size > 0) removeAwarenessStates(this.awareness, [...peer.clients], this);
    this.emit("peers", this.peers);
  }
}
