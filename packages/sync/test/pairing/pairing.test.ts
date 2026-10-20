import { describe, expect, it } from "bun:test";
import {
  CPace,
  isPairingCode,
  newPairingCode,
  normalizeCode,
  pairingRoom,
} from "../../src/pairing/cpace";
import { BrowserPairing, PAIRING_ATTEMPTS, PhonePairing } from "../../src/pairing/pairing-flow";
import { PAIRING_WORDS } from "../../src/pairing/pairing-words";

const sid = new Uint8Array(16).fill(3);

describe("CPace", () => {
  it("agrees on the same key and words with the same code", () => {
    const a = new CPace("K7QM4TXA", sid, "initiator");
    const b = new CPace("k7qm-4txa", sid, "responder");
    const ka = a.finish(b.share);
    const kb = b.finish(a.share);
    expect(ka?.sessionKey()).toEqual(kb?.sessionKey() as Uint8Array);
    expect(ka?.words()).toEqual(kb?.words() as string[]);
    expect(ka?.verify("responder", kb?.tag("responder") as Uint8Array)).toBe(true);
  });

  it("fails the tags with a different code", () => {
    const a = new CPace("K7QM4TXA", sid, "initiator");
    const b = new CPace("K7QM4TXB", sid, "responder");
    const ka = a.finish(b.share);
    const kb = b.finish(a.share);
    expect(ka?.verify("responder", kb?.tag("responder") as Uint8Array)).toBe(false);
  });

  it("refuses a share that is not a point", () => {
    expect(new CPace("K7QM4TXA", sid, "initiator").finish(new Uint8Array(32).fill(255))).toBeNull();
  });
});

describe("pairing codes", () => {
  it("makes readable codes that type back in any case or spacing", () => {
    const code = newPairingCode();
    expect(isPairingCode(code)).toBe(true);
    expect(code).not.toMatch(/[ILO01]/);
    expect(isPairingCode(`${code.slice(0, 4).toLowerCase()} ${code.slice(4)}`)).toBe(true);
    expect(normalizeCode(" ab-cd ")).toBe("ABCD");
  });

  it("finds the same room from the same code", () => {
    expect(pairingRoom("K7QM4TXA")).toBe(pairingRoom("k7qm 9999"));
    expect(pairingRoom("K7QM4TXA")).not.toBe(pairingRoom("Z7QM4TXA"));
  });

  it("has 256 distinct words", () => {
    expect(new Set(PAIRING_WORDS).size).toBe(256);
  });
});

/** A browser and a phone whose messages pass straight to each other. */
function room(browserCode: string, phoneCode: string) {
  let phone: PhonePairing;
  const browser = new BrowserPairing(
    browserCode,
    (to, body) => to === "phone" && phone.receive("browser", body),
  );
  phone = new PhonePairing(
    phoneCode,
    (to, body) => to === "browser" && browser.receive("phone", body),
    "TECNO",
  );
  return { browser, phone };
}

describe("pairing a browser with a phone", () => {
  it("confirms a device only after it has saved the new space", () => {
    let phone!: PhonePairing;
    const waiting = new BrowserPairing(
      "K7QM4TXA",
      (to, body) => {
        if (to === "phone") phone.receive("android", body);
      },
      "device",
    );
    phone = new PhonePairing(
      "K7QM4TXA",
      (to, body) => {
        if (to === "android") waiting.receive("phone", body);
      },
      "iPhone",
    );
    let confirmed = false;
    const received: Record<string, unknown>[] = [];
    phone.on("approved", ({ extra }) => {
      confirmed = true;
      received.push(extra);
    });
    phone.begin("android", () => {});
    phone.approve({ root: "ab".repeat(32) });
    expect(confirmed).toBe(false);
    waiting.complete(true, { device: { name: "TECNO", platform: "android" }, saved: false });
    expect(confirmed).toBe(true);
    expect(received).toEqual([{ device: { name: "TECNO", platform: "android" } }]);
  });

  it("reports a failed device save to the approving phone", () => {
    let phone!: PhonePairing;
    const waiting = new BrowserPairing(
      "K7QM4TXA",
      (to, body) => {
        if (to === "phone") phone.receive("android", body);
      },
      "device",
    );
    phone = new PhonePairing(
      "K7QM4TXA",
      (to, body) => {
        if (to === "android") waiting.receive("phone", body);
      },
      "iPhone",
    );
    let failed = false;
    let confirmed = false;
    phone.on("failed", () => {
      failed = true;
    });
    phone.on("approved", () => {
      confirmed = true;
    });
    phone.begin("android", () => {});
    phone.approve({ root: "ab".repeat(32) });
    waiting.complete(false);
    expect(failed).toBe(true);
    expect(confirmed).toBe(false);
  });
  it("shows the same words, then hands over the same session key", () => {
    const { browser, phone } = room("K7QM4TXA", "K7QM4TXA");
    const seen: string[][] = [];
    browser.on("words", (words) => seen.push(words));
    phone.on("words", (words) => seen.push(words));
    let paired: { phoneName: string; sessionKey: Uint8Array } | null = null;
    let approved: Uint8Array | null = null;
    browser.on("approved", (result) => {
      paired = result;
    });
    phone.on("approved", ({ sessionKey }) => {
      approved = sessionKey;
    });
    phone.begin("browser", () => {});
    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual(seen[1] as string[]);
    phone.approve();
    expect(paired).not.toBeNull();
    expect((paired as unknown as { phoneName: string }).phoneName).toBe("TECNO");
    expect((paired as unknown as { sessionKey: Uint8Array }).sessionKey).toEqual(
      approved as unknown as Uint8Array,
    );
  });

  it("hands over sealed extra data, such as a space's secret, with the approval", () => {
    const { browser, phone } = room("K7QM4TXA", "K7QM4TXA");
    const received: Record<string, unknown>[] = [];
    browser.on("approved", (result) => {
      received.push(result.extra);
    });
    phone.begin("browser", () => {});
    phone.approve({ root: "ab".repeat(32), name: "ignored" });
    expect(received).toEqual([{ root: "ab".repeat(32) }]);
  });

  it("tells the approving side whether a browser or a device is waiting", () => {
    const { phone } = room("K7QM4TXA", "K7QM4TXA");
    phone.begin("browser", () => {});
    expect(phone.waitingKind).toBe("browser");
    let device!: PhonePairing;
    const waiting = new BrowserPairing(
      "K7QM4TXA",
      (to, body) => to === "phone" && device.receive("laptop", body),
      "device",
    );
    device = new PhonePairing(
      "K7QM4TXA",
      (to, body) => to === "laptop" && waiting.receive("phone", body),
      "TECNO",
    );
    device.begin("laptop", () => {});
    expect(device.waitingKind).toBe("device");
  });

  it("counts wrong codes and gives up after a few", () => {
    const { browser, phone } = room("K7QM4TXA", "K7QM4TXB");
    const left: number[] = [];
    let exhausted = false;
    let phoneWrong = 0;
    browser.on("wrong", (n) => left.push(n));
    browser.on("exhausted", () => {
      exhausted = true;
    });
    phone.on("wrong", () => phoneWrong++);
    for (let i = 0; i < PAIRING_ATTEMPTS; i++) phone.begin("browser", () => {});
    expect(left).toEqual([4, 3, 2, 1]);
    expect(exhausted).toBe(true);
    expect(phoneWrong).toBe(PAIRING_ATTEMPTS);
  });

  it("hands over nothing when the person rejects the words", () => {
    const { browser, phone } = room("K7QM4TXA", "K7QM4TXA");
    let approved = false;
    let rejected = false;
    browser.on("approved", () => {
      approved = true;
    });
    browser.on("rejected", () => {
      rejected = true;
    });
    phone.begin("browser", () => {});
    phone.reject();
    expect(approved).toBe(false);
    expect(rejected).toBe(true);
  });
});
