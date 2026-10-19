import { Emitter } from "../lib/typed-emitter";

/** A message another device in the room sent; `body` is whatever it sent, usually sealed. */
export interface RoomMessage {
  from: string;
  body: string;
}

type Events = {
  message: (message: RoomMessage) => void;
  /** Every device in the room right now, this one included. */
  presence: (online: string[]) => void;
  open: () => void;
  close: () => void;
};

type ServerMessage =
  | { type: "message"; from: string; body: string }
  | { type: "presence"; online: string[] };

const RETRY_FIRST = 1000;
const RETRY_MOST = 30_000;

/**
 * A seat in a room on the server (the space Durable Object), which
 * passes messages between the devices in it and says who is there. It
 * stores nothing. Reconnects by itself, waiting longer each time.
 */
export class RoomSocket extends Emitter<Events> {
  #socket: WebSocket | null = null;
  #retry = RETRY_FIRST;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #stopped = true;
  #online: string[] = [];

  constructor(
    /** e.g. wss://notables.pherus.org/spaces/connect */
    private readonly endpoint: string,
    readonly room: string,
    readonly deviceId: string,
  ) {
    super();
  }

  get online(): string[] {
    return this.#online;
  }

  get open(): boolean {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  start() {
    if (!this.#stopped) return;
    this.#stopped = false;
    this.#connect();
  }

  stop() {
    this.#stopped = true;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    const socket = this.#socket;
    this.#socket = null;
    socket?.close();
  }

  /** A resumed app must not trust a socket left open while the OS suspended it. */
  reconnect() {
    if (this.#stopped) return;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    const socket = this.#socket;
    this.#socket = null;
    socket?.close();
    this.#online = [];
    this.emit("close");
    this.#connect();
  }

  /** To one device, or to everyone else in the room when `to` is null. */
  send(to: string | null, body: string): boolean {
    if (!this.open) return false;
    this.#socket?.send(JSON.stringify({ to, body }));
    return true;
  }

  #connect() {
    const url = new URL(this.endpoint);
    url.searchParams.set("room", this.room);
    url.searchParams.set("device", this.deviceId);
    const socket = new WebSocket(url);
    this.#socket = socket;
    socket.addEventListener("open", () => {
      if (this.#socket !== socket) return;
      this.#retry = RETRY_FIRST;
      this.emit("open");
    });
    socket.addEventListener("message", (event) => {
      if (this.#socket !== socket) return;
      if (typeof event.data !== "string") return;
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      if (message.type === "presence") {
        this.#online = message.online;
        this.emit("presence", message.online);
      } else if (message.type === "message") {
        this.emit("message", { from: message.from, body: message.body });
      }
    });
    socket.addEventListener("close", () => {
      if (this.#socket !== socket) return;
      this.#socket = null;
      this.#online = [];
      this.emit("close");
      if (this.#stopped) return;
      this.#timer = setTimeout(() => this.#connect(), this.#retry);
      this.#retry = Math.min(RETRY_MOST, this.#retry * 2);
    });
  }
}
