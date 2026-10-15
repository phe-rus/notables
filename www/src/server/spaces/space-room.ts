import { DurableObject } from "cloudflare:workers";

/** The most seats in one room: a space's devices and browsers, or one pairing. */
const MAX_SEATS = 16;
/** Bigger messages are dropped; the sender splits its data instead. */
const MAX_MESSAGE = 256 * 1024;
const DEVICE = /^[\w-]{6,64}$/;

interface Seat {
  device: string;
}

/**
 * A meeting point for devices that share a secret room name: it passes
 * each message to the device it is for and tells everyone who is there.
 * It never stores anything (no storage calls at all); the only state is
 * which socket belongs to which device, kept on the sockets themselves so
 * the room can hibernate between messages.
 */
export class SpaceRoom extends DurableObject {
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    const device = new URL(request.url).searchParams.get("device") ?? "";
    if (!DEVICE.test(device)) return new Response("Bad device", { status: 400 });

    // A device that reconnects replaces its old seat.
    for (const old of this.ctx.getWebSockets(device)) old.close(4000, "Replaced");
    if (this.#seats().length >= MAX_SEATS) return new Response("Room is full", { status: 429 });

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server, [device]);
    server.serializeAttachment({ device } satisfies Seat);
    this.#presence();
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > MAX_MESSAGE) return;
    let parsed: { to?: unknown; body?: unknown };
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if (typeof parsed.body !== "string") return;
    const from = (socket.deserializeAttachment() as Seat | null)?.device;
    if (!from) return;
    const out = JSON.stringify({ type: "message", from, body: parsed.body });
    const targets =
      typeof parsed.to === "string"
        ? this.ctx.getWebSockets(parsed.to)
        : this.#seats().filter((seat) => seat !== socket);
    for (const target of targets) this.#send(target, out);
  }

  override async webSocketClose(socket: WebSocket) {
    this.#leave(socket);
  }

  override async webSocketError(socket: WebSocket) {
    this.#leave(socket);
  }

  #leave(socket: WebSocket) {
    try {
      socket.close(1000, "Bye");
    } catch {
      // Already closed.
    }
    this.#presence(socket);
  }

  #seats(except?: WebSocket): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((seat) => seat !== except && seat.readyState === WebSocket.OPEN);
  }

  /** Tells everyone in the room who is in it. */
  #presence(leaving?: WebSocket) {
    const seats = this.#seats(leaving);
    const online = [
      ...new Set(seats.map((seat) => (seat.deserializeAttachment() as Seat | null)?.device)),
    ].filter(Boolean);
    const out = JSON.stringify({ type: "presence", online });
    for (const seat of seats) this.#send(seat, out);
  }

  #send(socket: WebSocket, data: string) {
    try {
      socket.send(data);
    } catch {
      // Gone; its close event tidies up.
    }
  }
}

const ROOM = /^[0-9a-f]{32}$/;

/** `/spaces/connect?room=…&device=…`: a WebSocket seat in that room. */
export function connectToRoom(
  request: Request,
  rooms: DurableObjectNamespace,
): Response | Promise<Response> {
  const room = new URL(request.url).searchParams.get("room") ?? "";
  if (!ROOM.test(room)) return new Response("Bad room", { status: 400 });
  return rooms.get(rooms.idFromName(room)).fetch(request);
}
