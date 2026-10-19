import { expect, spyOn, test } from "bun:test";
import { LocalLink, RoomSocket, SpacePeer } from "@notables/sync";
import * as platform from "../../src/platform/device-platform";
import * as device from "../../src/platform/session/this-device";
import * as identity from "../../src/platform/space/space-identity";
import { startSpaceSync, stopSpaceSync } from "../../src/platform/space/space-sync";

const emit = (target: object | undefined, event: string, ...args: unknown[]) => {
  if (target) Reflect.apply(Reflect.get(target, "emit"), target, [event, ...args]);
};

test("apps try local transport first and keep it when the meeting room disconnects", () => {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const globals = {
    window: new EventTarget(),
    location: { origin: "https://example.test" },
    document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
    localStorage: { getItem: () => null, setItem: () => {} },
    RTCPeerConnection: class extends EventTarget {
      close() {}
    },
    setTimeout: (() => 1) as unknown as typeof setTimeout,
    clearTimeout: (() => {}) as typeof clearTimeout,
  };
  for (const [name, value] of Object.entries(globals)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
  const root = spyOn(identity, "spaceRoot").mockReturnValue(new Uint8Array(32).fill(1));
  const key = spyOn(identity, "deviceKey").mockReturnValue(null);
  const id = spyOn(device, "thisDeviceId").mockReturnValue("aaa-device");
  const name = spyOn(device, "thisDeviceName").mockReturnValue("Test phone");
  const os = spyOn(platform, "devicePlatform").mockReturnValue({
    os: "android",
    app: true,
    browser: "chrome",
  });
  let room: RoomSocket | undefined;
  const start = spyOn(RoomSocket.prototype, "start").mockImplementation(function (
    this: RoomSocket,
  ) {
    room = this;
    Object.defineProperty(this, "open", { get: () => true });
  });
  let direct: LocalLink | undefined;
  const call = spyOn(LocalLink.prototype, "call").mockImplementation(async function (
    this: LocalLink,
  ) {
    direct = this;
  });
  const attach = spyOn(SpacePeer.prototype, "attach").mockImplementation(() => {});
  const detach = spyOn(SpacePeer.prototype, "detach").mockImplementation(() => {});
  try {
    startSpaceSync(async () => []);
    emit(room, "presence", ["aaa-device", "bbb-device"]);
    expect(direct).toBeDefined();
    expect(attach).not.toHaveBeenCalled();
    if (!direct) throw new Error("Direct connection was not attempted");
    Object.defineProperty(direct, "isOpen", { get: () => true });
    emit(direct, "open");
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach.mock.calls[0]?.[0]).toBe(direct);
    emit(room, "close");
    emit(room, "presence", []);
    expect(detach).not.toHaveBeenCalled();
    stopSpaceSync();
    expect(detach).toHaveBeenCalledTimes(1);
  } finally {
    stopSpaceSync();
    for (const stub of [root, key, id, name, os, start, call, attach, detach]) stub.mockRestore();
    for (const [name, descriptor] of originals)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
  }
});
