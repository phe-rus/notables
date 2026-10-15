import { Emitter } from "../lib/typed-emitter";

type Events = {
  open: () => void;
  close: () => void;
  data: (data: Uint8Array) => void;
};

/** What two sides exchange, through the room, to open the link. */
export type LinkSignal = { kind: "offer"; sdp: string } | { kind: "answer"; sdp: string };

const GATHER_TIMEOUT = 3000;
/** Sending pauses while more than this is queued on the channel. */
const BUFFER_HIGH = 1024 * 1024;

/**
 * A direct connection on the local network (WebRTC with no STUN or TURN
 * servers, so the only addresses either side knows are local ones). If the
 * two devices cannot reach each other on this network, it never opens:
 * nothing ever takes a path through the internet.
 */
export class LocalLink extends Emitter<Events> {
  readonly #connection = new RTCPeerConnection({ iceServers: [] });
  #channel: RTCDataChannel | null = null;
  #closed = false;

  constructor(private readonly signal: (signal: LinkSignal) => void) {
    super();
    this.#connection.addEventListener("connectionstatechange", () => {
      const state = this.#connection.connectionState;
      if (state === "failed" || state === "closed") this.close();
    });
    this.#connection.addEventListener("datachannel", (event) => this.#attach(event.channel));
  }

  get isOpen(): boolean {
    return this.#channel?.readyState === "open";
  }

  /** The calling side: offers a connection. */
  async call() {
    this.#attach(this.#connection.createDataChannel("notables", { ordered: true }));
    await this.#connection.setLocalDescription(await this.#connection.createOffer());
    await this.#gathered();
    const sdp = this.#connection.localDescription?.sdp;
    if (sdp && !this.#closed) this.signal({ kind: "offer", sdp });
  }

  /** Takes the other side's offer or answer. */
  async receive(signal: LinkSignal) {
    if (this.#closed) return;
    if (signal.kind === "offer") {
      await this.#connection.setRemoteDescription({ type: "offer", sdp: signal.sdp });
      await this.#connection.setLocalDescription(await this.#connection.createAnswer());
      await this.#gathered();
      const sdp = this.#connection.localDescription?.sdp;
      if (sdp && !this.#closed) this.signal({ kind: "answer", sdp });
    } else if (this.#connection.signalingState === "have-local-offer") {
      await this.#connection.setRemoteDescription({ type: "answer", sdp: signal.sdp });
    }
  }

  async send(data: Uint8Array) {
    const channel = this.#channel;
    if (channel?.readyState !== "open") return;
    if (channel.bufferedAmount > BUFFER_HIGH) {
      channel.bufferedAmountLowThreshold = BUFFER_HIGH / 4;
      await new Promise<void>((resolve) => {
        const done = () => {
          channel.removeEventListener("bufferedamountlow", done);
          channel.removeEventListener("close", done);
          resolve();
        };
        channel.addEventListener("bufferedamountlow", done);
        channel.addEventListener("close", done);
      });
    }
    if (channel.readyState === "open") channel.send(data as Uint8Array<ArrayBuffer>);
  }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    try {
      this.#channel?.close();
      this.#connection.close();
    } catch {
      // Already closed.
    }
    this.emit("close");
  }

  #attach(channel: RTCDataChannel) {
    this.#channel = channel;
    channel.binaryType = "arraybuffer";
    channel.addEventListener("open", () => this.emit("open"));
    channel.addEventListener("close", () => this.close());
    channel.addEventListener("message", (event) => {
      if (event.data instanceof ArrayBuffer) this.emit("data", new Uint8Array(event.data));
    });
  }

  /** Waits for the local addresses, so one offer or answer carries them all. */
  #gathered(): Promise<void> {
    const connection = this.#connection;
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
}
