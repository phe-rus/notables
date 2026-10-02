import type { Signal, SignalData, Signaling } from "@notables/sync";
import { pollSignals, postSignal } from "../../../server/signals/signals.functions";
import { decryptJson, encryptJson, sha256Hex } from "./share-crypto";

const IDLE_POLL = 3000;
const BUSY_POLL = 700;
const BUSY_FOR = 15_000;

/**
 * Signalling through the app's Worker: a short-lived mailbox per share.
 * The room is a hash and every message is sealed with the share's key,
 * so the server learns nothing about the note or who is talking.
 */
export class MailboxSignaling implements Signaling {
  #room: Promise<string>;
  #cursor = 0;
  #busyUntil = 0;

  constructor(
    shareId: string,
    private readonly key: string,
    private readonly selfId: string,
  ) {
    this.#room = sha256Hex(`notables-room:${shareId}`);
  }

  async send(to: string | null, data: SignalData) {
    this.#busyUntil = Date.now() + BUSY_FOR;
    await postSignal({
      data: {
        room: await this.#room,
        sender: this.selfId,
        recipient: to,
        payload: await encryptJson(this.key, data),
      },
    });
  }

  subscribe(onSignal: (signal: Signal) => void): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const { signals, cursor } = await pollSignals({
          data: { room: await this.#room, me: this.selfId, after: this.#cursor },
        });
        this.#cursor = cursor;
        for (const signal of signals) {
          const data = await decryptJson<SignalData>(this.key, signal.payload);
          // Anything not sealed with our key is noise; ignore it.
          if (data && !stopped) {
            this.#busyUntil = Date.now() + BUSY_FOR;
            onSignal({ from: signal.sender, data });
          }
        }
      } catch {
        // Offline for now; try again shortly.
      }
      if (!stopped) timer = setTimeout(tick, Date.now() < this.#busyUntil ? BUSY_POLL : IDLE_POLL);
    };
    void tick();
    // Look again straight away when the app comes back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === "visible" && timer) {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }
}
