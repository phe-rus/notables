import { afterEach, expect, test } from "bun:test";
import { RoomSocket } from "../../src/session/room-socket";

const original = globalThis.WebSocket;
class Socket extends EventTarget {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  constructor(readonly url: string | URL) {
    super();
    Socket.instances.push(this);
  }
  send() {}
  close() {
    this.readyState = 3;
  }
}
afterEach(() => {
  globalThis.WebSocket = original;
  Socket.instances = [];
});

test("resuming replaces a stale open socket and ignores its late presence", () => {
  globalThis.WebSocket = Socket as unknown as typeof WebSocket;
  const room = new RoomSocket("wss://example.test/spaces/connect", "room", "device");
  let closes = 0;
  room.on("close", () => {
    closes++;
  });
  room.start();
  const first = Socket.instances[0];
  first?.dispatchEvent(
    new MessageEvent("message", { data: JSON.stringify({ type: "presence", online: ["old"] }) }),
  );
  room.reconnect();
  expect(closes).toBe(1);
  expect(Socket.instances).toHaveLength(2);
  first?.dispatchEvent(
    new MessageEvent("message", { data: JSON.stringify({ type: "presence", online: ["stale"] }) }),
  );
  expect(room.online).toEqual([]);
  Socket.instances[1]?.dispatchEvent(
    new MessageEvent("message", { data: JSON.stringify({ type: "presence", online: ["new"] }) }),
  );
  expect(room.online).toEqual(["new"]);
  room.stop();
  room.reconnect();
  expect(Socket.instances).toHaveLength(2);
});
