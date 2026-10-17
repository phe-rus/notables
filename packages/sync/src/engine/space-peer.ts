import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import * as Y from "yjs";
import type { PeerMedia } from "../peer/media-exchange";
import type { FrameLink } from "../session/session-frames";
import { type DocSource, SessionHost } from "../session/session-host";

/** What a device's own storage offers the engine. */
export interface SpaceDocs extends DocSource {
  /** Every note document the library still knows (not erased), by storage name. */
  notes(): Promise<string[]>;
}

/** The documents that go first, so lists and settings appear before any note. */
const FIRST = ["library", "settings"] as const;

/** How long a document opened only to catch up stays open after its last change. */
const IDLE_RELEASE = 15_000;

type Control =
  | { type: "hello"; name: string; platform: string }
  | { type: "digest"; docs: Record<string, string> };

/**
 * Keeps one other device of the space in step, both ways (spec 0005,
 * AC-5 to AC-7). The library and settings sync first; then each side sends
 * a digest of its notes (a hash of each state vector) and offers the ones
 * that differ, so meeting again costs only what changed. Notes open on
 * either device stay live while open; the rest are let go once caught up.
 */
export class SpacePeer {
  readonly #host: SessionHost;
  readonly #docs: SpaceDocs;
  /** Documents held open by this device's own screens; never released for idling. */
  readonly #pinned = new Set<string>();
  readonly #idle = new Map<string, ReturnType<typeof setTimeout>>();
  #digestSent = false;

  constructor(
    key: Uint8Array,
    docs: SpaceDocs,
    private readonly hello: { name: string; platform: string },
    private readonly onHello: (info: { name: string; platform: string }) => void = () => {},
  ) {
    this.#docs = docs;
    this.#host = new SessionHost(
      key,
      {
        open: async (name) => {
          const opened = await docs.open(name);
          this.#touch(name);
          return opened;
        },
        remove: (name) => docs.remove(name),
      },
      (message) => void this.#onControl(message as Control),
      (name) => {
        this.#touch(name);
        if (name === "library" && !this.#digestSent) void this.#sendDigest();
      },
    );
  }

  shareMedia(media: PeerMedia, arrived?: (id: string) => void) {
    this.#host.shareMedia(media, arrived);
  }

  attach(link: FrameLink) {
    this.#host.attach(link);
    this.#digestSent = false;
    this.#host.sendControl({ type: "hello", ...this.hello } satisfies Control);
    for (const name of FIRST) this.#host.offer(name);
    for (const name of this.#pinned) this.#host.offer(name);
  }

  detach() {
    for (const timer of this.#idle.values()) clearTimeout(timer);
    this.#idle.clear();
    this.#host.detach();
  }

  receive(data: Uint8Array) {
    this.#host.receive(data);
  }

  /** A screen on this device opened a document: keep it live with this peer. */
  pin(name: string) {
    this.#pinned.add(name);
    this.#host.offer(name);
  }

  unpin(name: string) {
    this.#pinned.delete(name);
    this.#touch(name);
  }

  async #onControl(message: Control) {
    if (message.type === "hello") {
      this.onHello({ name: message.name, platform: message.platform });
    } else if (message.type === "digest") {
      const mine = await this.#digest();
      for (const [name, hash] of Object.entries(message.docs)) {
        // Only notes this device's library knows: one it erased stays erased.
        if (name in mine && mine[name] !== hash) this.#host.offer(name);
      }
    }
  }

  async #sendDigest() {
    this.#digestSent = true;
    this.#host.sendControl({ type: "digest", docs: await this.#digest() } satisfies Control);
  }

  /** A hash of each note's state vector: equal hashes mean nothing to send. */
  async #digest(): Promise<Record<string, string>> {
    const digest: Record<string, string> = {};
    for (const name of await this.#docs.notes()) {
      const { doc, release } = await this.#docs.open(name);
      try {
        digest[name] = bytesToHex(sha256(Y.encodeStateVector(doc))).slice(0, 32);
      } finally {
        release();
      }
    }
    return digest;
  }

  /** Lets a document go once it has been quiet for a while, unless a screen holds it. */
  #touch(name: string) {
    if ((FIRST as readonly string[]).includes(name)) return;
    clearTimeout(this.#idle.get(name));
    if (this.#pinned.has(name)) return;
    this.#idle.set(
      name,
      setTimeout(() => {
        this.#idle.delete(name);
        if (!this.#pinned.has(name)) this.#host.release(name);
      }, IDLE_RELEASE),
    );
  }
}
