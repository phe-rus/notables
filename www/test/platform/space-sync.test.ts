import { expect, spyOn, test } from "bun:test";
import { LocalLink, RoomSocket, SpacePeer } from "@notables/sync";
import * as platform from "@/platform/device-platform";
import * as device from "@/platform/session/this-device";
import { spaceDeviceStore } from "@/platform/space/space-device-store";
import * as identity from "@/platform/space/space-identity";
import { markRemoved, rememberPairedDevice } from "@/platform/space/space-membership";
import { rejoinSpaceSync, startSpaceSync, stopSpaceSync } from "@/platform/space/space-sync";

const emit = (target: object | undefined, event: string, ...args: unknown[]) => {
  if (target) Reflect.apply(Reflect.get(target, "emit"), target, [event, ...args]);
};

test.each(["fresh", "different-space", "still-removed", "paired-again"] as const)(
  "device membership and local transport: %s",
  (scenario) => {
    const values = new Map<string, string>();
    const originals = new Map<string, PropertyDescriptor | undefined>();
    const globals = {
      window: new EventTarget(),
      location: { origin: "https://example.test" },
      document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
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
    const root = spyOn(identity, "spaceRoot").mockReturnValue(
      new Uint8Array(32).fill(
        ["fresh", "different-space", "still-removed", "paired-again"].indexOf(scenario) + 1,
      ),
    );
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
      if (scenario !== "fresh") markRemoved(["bbb-device"]);
      if (scenario === "different-space") {
        root.mockReturnValue(new Uint8Array(32).fill(10));
        rejoinSpaceSync();
      }
      if (scenario === "paired-again") {
        rememberPairedDevice({ id: "bbb-device", name: "Approved phone", platform: "ios" });
        expect(spaceDeviceStore.getState()).toMatchObject([
          { id: "bbb-device", name: "Approved phone", online: false },
        ]);
        rejoinSpaceSync();
        markRemoved(["bbb-device"]);
        expect(spaceDeviceStore.getState()).toMatchObject([
          { id: "bbb-device", name: "Approved phone", online: false },
        ]);
      }
      emit(room, "presence", ["aaa-device", "bbb-device"]);
      if (scenario === "still-removed") {
        expect(direct).toBeUndefined();
        expect(spaceDeviceStore.getState()).toHaveLength(0);
        return;
      }
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
  },
);
