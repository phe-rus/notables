import { randomBytes } from "@noble/hashes/utils.js";
import { Emitter } from "../lib/typed-emitter";
import { fromBase64, open, seal, toBase64 } from "../space/space-keys";
import { CPace, type PairingKeys } from "./cpace";

/*
 * Pairing a browser with a phone, in the room the code points to:
 *
 *   phone   → hello                       (to the browser, or to everyone for a typed code)
 *   browser → start   { sid, share, kind } (its half, and whether it is a browser or a device)
 *   phone   → share   { share, tag }      (its half, and proof it used the same code)
 *   browser → confirm { tag } | wrong     (its proof; both now show four words)
 *   phone   → approved { sealed name } | rejected   (after the person checks the words)
 *
 * The code never crosses the wire; a wrong one fails the tags, and the
 * browser allows a few of those before it gives up on the code.
 */

type Message =
  | { t: "hello" }
  | { t: "start"; sid: string; share: string; kind?: WaitingKind; receipt?: boolean }
  | { t: "share"; share: string; tag: string }
  | { t: "confirm"; tag: string }
  | { t: "wrong" }
  | { t: "approved"; info: string }
  | { t: "complete"; info: string }
  | { t: "rejected" };

export type Send = (to: string, body: string) => void;

/** What is waiting to be linked: a browser (a window onto a phone) or a device of the space. */
export type WaitingKind = "browser" | "device";

const encode = (message: Message) => JSON.stringify(message);

function decode(body: string): Message | null {
  try {
    const message = JSON.parse(body) as Message;
    return typeof message?.t === "string" ? message : null;
  } catch {
    return null;
  }
}

const text = new TextEncoder();
const read = new TextDecoder();

/** What the browser keeps once a phone approves it. */
export interface PairedPhone {
  phoneId: string;
  phoneName: string;
  sessionKey: Uint8Array;
  /** Whatever else the approving device sent, sealed: a space's secret when linking a device. */
  extra: Record<string, unknown>;
}

/** The most wrong codes a browser accepts before it needs a new one. */
export const PAIRING_ATTEMPTS = 5;

type BrowserEvents = {
  /** A phone used the right code: show these words until it decides. */
  words: (words: string[]) => void;
  /** A phone tried a wrong code. */
  wrong: (attemptsLeft: number) => void;
  approved: (phone: PairedPhone) => void;
  rejected: () => void;
  /** Too many wrong codes: make a new one. */
  exhausted: () => void;
};

/** The browser's side: waits with its code for a phone to approve it. */
export class BrowserPairing extends Emitter<BrowserEvents> {
  #attempts = 0;
  #pending = new Map<string, { cpace: CPace; sid: Uint8Array; keys?: PairingKeys }>();
  #done = false;
  #receipt: { to: string; key: Uint8Array } | null = null;

  constructor(
    private readonly code: string,
    private readonly send: Send,
    private readonly kind: WaitingKind = "browser",
  ) {
    super();
  }

  receive(from: string, body: string) {
    const message = decode(body);
    if (!message || this.#done) return;
    switch (message.t) {
      case "hello": {
        const sid = randomBytes(16);
        const cpace = new CPace(this.code, sid, "initiator");
        this.#pending.set(from, { cpace, sid });
        this.send(
          from,
          encode({
            t: "start",
            sid: toBase64(sid),
            share: toBase64(cpace.share),
            kind: this.kind,
            receipt: this.kind === "device",
          }),
        );
        break;
      }
      case "share": {
        const pending = this.#pending.get(from);
        if (!pending) return;
        const keys = pending.cpace.finish(fromBase64(message.share));
        if (!keys?.verify("responder", fromBase64(message.tag))) {
          this.#pending.delete(from);
          this.send(from, encode({ t: "wrong" }));
          this.#attempts += 1;
          if (this.#attempts >= PAIRING_ATTEMPTS) {
            this.#done = true;
            this.emit("exhausted");
          } else this.emit("wrong", PAIRING_ATTEMPTS - this.#attempts);
          return;
        }
        pending.keys = keys;
        this.send(from, encode({ t: "confirm", tag: toBase64(keys.tag("initiator")) }));
        this.emit("words", keys.words());
        break;
      }
      case "approved": {
        const keys = this.#pending.get(from)?.keys;
        if (!keys) return;
        const sessionKey = keys.sessionKey();
        const info = open(sessionKey, fromBase64(message.info));
        if (!info) return;
        const { name, ...extra } = JSON.parse(read.decode(info)) as { name: string };
        this.#done = true;
        if (this.kind === "device") this.#receipt = { to: from, key: sessionKey };
        this.emit("approved", { phoneId: from, phoneName: name, sessionKey, extra });
        break;
      }
      case "rejected":
        if (this.#pending.get(from)?.keys) {
          this.#pending.delete(from);
          this.emit("rejected");
        }
        break;
    }
  }

  /** A native device acknowledges only after the received space is safely kept. */
  complete(saved: boolean) {
    const receipt = this.#receipt;
    if (!receipt) return;
    this.#receipt = null;
    this.send(
      receipt.to,
      encode({
        t: "complete",
        info: toBase64(seal(receipt.key, text.encode(JSON.stringify({ saved })))),
      }),
    );
  }
}

type PhoneEvents = {
  words: (words: string[]) => void;
  /** The code did not match this browser. */
  wrong: () => void;
  approved: (browser: { browserId: string; sessionKey: Uint8Array }) => void;
  failed: () => void;
};

/** The phone's side: knows the code, and approves once the person checks the words. */
export class PhonePairing extends Emitter<PhoneEvents> {
  #browser: string | null = null;
  #keys: PairingKeys | null = null;
  #kind: WaitingKind = "browser";
  #receipt = false;
  #awaiting = false;

  /** Whether a browser or a device is waiting; only a device may receive a space's secret. */
  get waitingKind(): WaitingKind {
    return this.#kind;
  }

  constructor(
    private readonly code: string,
    private readonly send: Send,
    /** This phone's name, for the browser to show. */
    private readonly name: string,
  ) {
    super();
  }

  /** Says hello to a browser (from its QR code), or to every browser waiting in the room. */
  begin(browserId: string | null, broadcast: (body: string) => void) {
    if (browserId) this.send(browserId, encode({ t: "hello" }));
    else broadcast(encode({ t: "hello" }));
  }

  receive(from: string, body: string) {
    const message = decode(body);
    if (!message) return;
    if (message.t === "start") {
      // One browser at a time: the first to answer is the one being paired.
      if (this.#browser && this.#browser !== from) return;
      this.#browser = from;
      this.#kind = message.kind === "device" ? "device" : "browser";
      this.#receipt = this.#kind === "device" && message.receipt === true;
      const cpace = new CPace(this.code, fromBase64(message.sid), "responder");
      const keys = cpace.finish(fromBase64(message.share));
      if (!keys) return;
      this.#keys = keys;
      this.send(
        from,
        encode({ t: "share", share: toBase64(cpace.share), tag: toBase64(keys.tag("responder")) }),
      );
    } else if (message.t === "confirm" && from === this.#browser && this.#keys) {
      if (this.#keys.verify("initiator", fromBase64(message.tag)))
        this.emit("words", this.#keys.words());
      else this.#fail();
    } else if (message.t === "wrong" && from === this.#browser) {
      this.#fail();
    } else if (message.t === "complete" && from === this.#browser && this.#keys && this.#awaiting) {
      const info = open(this.#keys.sessionKey(), fromBase64(message.info));
      if (!info) return;
      const result = JSON.parse(read.decode(info)) as { saved?: unknown };
      if (typeof result.saved !== "boolean") return;
      this.#awaiting = false;
      if (result.saved)
        this.emit("approved", { browserId: from, sessionKey: this.#keys.sessionKey() });
      else this.emit("failed");
    }
  }

  /**
   * The person saw the same words on both screens. `extra` travels sealed
   * with the pairing key: a space's secret when linking one of their devices.
   */
  approve(extra: Record<string, unknown> = {}) {
    const browser = this.#browser;
    const keys = this.#keys;
    if (!browser || !keys) return;
    const sessionKey = keys.sessionKey();
    const info = seal(sessionKey, text.encode(JSON.stringify({ ...extra, name: this.name })));
    this.#awaiting = this.#receipt;
    this.send(browser, encode({ t: "approved", info: toBase64(info) }));
    if (!this.#receipt) this.emit("approved", { browserId: browser, sessionKey });
  }

  reject() {
    if (this.#browser) this.send(this.#browser, encode({ t: "rejected" }));
    this.#browser = null;
    this.#keys = null;
  }

  #fail() {
    this.#browser = null;
    this.#keys = null;
    this.emit("wrong");
  }
}
