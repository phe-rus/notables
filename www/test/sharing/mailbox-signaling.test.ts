import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { SignalData } from "@notables/sync";

const poll = mock(async () => ({ signals: [], cursor: 0 }));
const post = mock(async () => {});
mock.module("@/server/signals/signals.functions", () => ({ pollSignals: poll, postSignal: post }));

const { MailboxSignaling } = await import("@/features/sharing/lib/mailbox-signaling");
const { newShareKey } = await import("@/features/sharing/lib/share-crypto");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const visibility = new EventTarget();
let resume: () => void = () => {};
let scheduled: (() => void) | undefined;
let delay = 0;
let clock = 0;
let stop: (() => void) | undefined;
let timerSpy: ReturnType<typeof spyOn> | undefined;
let cancelSpy: ReturnType<typeof spyOn> | undefined;
let nowSpy: ReturnType<typeof spyOn> | undefined;

async function settle() {
  // Web Crypto completes outside the Promise microtask queue.
  await Bun.sleep(10);
}

function start() {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      visibilityState: "visible",
      addEventListener: (_: string, callback: EventListener) => {
        resume = () => callback(new Event("visibilitychange"));
        visibility.addEventListener("visibilitychange", callback);
      },
      removeEventListener: (_: string, callback: EventListener) => {
        visibility.removeEventListener("visibilitychange", callback);
      },
    },
  });
  clock = 0;
  scheduled = undefined;
  delay = 0;
  poll.mockClear();
  post.mockClear();
  nowSpy = spyOn(Date, "now").mockImplementation(() => clock);
  timerSpy = spyOn(globalThis, "setTimeout").mockImplementation(
    Object.assign((callback: TimerHandler, ms?: number) => {
      scheduled = () => {
        if (typeof callback === "function") callback();
      };
      delay = Number(ms);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }, globalThis.setTimeout),
  );
  cancelSpy = spyOn(globalThis, "clearTimeout").mockImplementation(() => {});
  return new MailboxSignaling("test-share", newShareKey(), "self-device");
}

afterEach(() => {
  stop?.();
  stop = undefined;
  timerSpy?.mockRestore();
  cancelSpy?.mockRestore();
  nowSpy?.mockRestore();
  poll.mockReset();
  poll.mockImplementation(async () => ({ signals: [], cursor: 0 }));
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

describe("shared-note mailbox request lifecycle", () => {
  test("periodic discovery stays idle, but negotiation accelerates temporarily", async () => {
    const mailbox = start();
    stop = mailbox.subscribe(() => {});
    await settle();
    expect(delay).toBe(3000);
    for (const kind of ["announce", "bye"] satisfies SignalData["kind"][]) {
      clock += 12_000;
      await mailbox.send(null, { kind });
      scheduled?.();
      await settle();
      expect(delay).toBe(3000);
    }
    await mailbox.send("other-device", { kind: "offer", sdp: "test-offer" });
    scheduled?.();
    await settle();
    expect(delay).toBe(700);
    clock += 15_001;
    scheduled?.();
    await settle();
    expect(delay).toBe(3000);
  });

  test("foreground events cannot overlap an in-flight poll or restart after cleanup", async () => {
    const pending = Promise.withResolvers<{ signals: never[]; cursor: number }>();
    poll.mockImplementationOnce(() => pending.promise);
    const mailbox = start();
    stop = mailbox.subscribe(() => {});
    await settle();
    resume();
    resume();
    expect(poll).toHaveBeenCalledTimes(1);
    stop();
    resume();
    pending.resolve({ signals: [], cursor: 1 });
    await settle();
    expect(poll).toHaveBeenCalledTimes(1);
    expect(scheduled).toBeUndefined();
  });
});
