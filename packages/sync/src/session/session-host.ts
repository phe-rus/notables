import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import type * as Y from "yjs";
import {
  controlBody,
  decodeFrame,
  encodeFrame,
  FrameKind,
  type FrameLink,
  readControl,
} from "./session-frames";

/** Where the phone's documents come from: the live ones if open, else from storage. */
export interface DocSource {
  open(name: string): Promise<{ doc: Y.Doc; release(): void }>;
  remove(name: string): Promise<void>;
}

interface Served {
  doc: Y.Doc;
  release(): void;
  onUpdate(update: Uint8Array, origin: unknown): void;
}

/**
 * The phone's side of a browser session: answers for every document the
 * browser opens, applies the browser's edits, and sends the phone's own
 * changes back while the browser has the document open.
 */
export class SessionHost {
  #link: FrameLink | null = null;
  #served = new Map<string, Served>();
  /** Frames are handled one at a time, in order, since opening a document waits on storage. */
  #queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly key: Uint8Array,
    private readonly source: DocSource,
    private readonly onControl: (message: unknown) => void = () => {},
    /** A document caught up with the other side (its step 2 arrived). */
    private readonly onSynced: (name: string) => void = () => {},
  ) {}

  /** Opens a document from this side and asks the other for what it has. */
  offer(name: string) {
    this.#queue = this.#queue
      .then(async () => {
        if (this.#served.has(name)) return;
        await this.#serve(name);
        const ask = encoding.createEncoder();
        syncProtocol.writeSyncStep1(ask, (this.#served.get(name) as Served).doc);
        this.#send(FrameKind.sync, name, encoding.toUint8Array(ask));
      })
      .catch(() => {});
  }

  /** Stops keeping a document in step; the other side can ask again. */
  release(name: string) {
    this.#queue = this.#queue.then(() => this.#release(name)).catch(() => {});
  }

  get served(): string[] {
    return [...this.#served.keys()];
  }

  attach(link: FrameLink) {
    this.#link = link;
  }

  /** The connection is gone: let go of every document until the browser asks again. */
  detach() {
    this.#link = null;
    for (const name of [...this.#served.keys()]) this.#release(name);
  }

  sendControl(message: unknown) {
    this.#send(FrameKind.control, "", controlBody(message));
  }

  receive(data: Uint8Array) {
    const frame = decodeFrame(this.key, data);
    if (!frame) return;
    this.#queue = this.#queue
      .then(async () => {
        switch (frame.kind) {
          case FrameKind.sync:
            await this.#sync(frame.doc, frame.body);
            break;
          case FrameKind.close:
            this.#release(frame.doc);
            break;
          case FrameKind.remove:
            this.#release(frame.doc);
            await this.source.remove(frame.doc);
            break;
          case FrameKind.control: {
            const message = readControl(frame.body);
            if (message) this.onControl(message);
            break;
          }
        }
      })
      .catch(() => {});
  }

  async #serve(name: string) {
    const { doc, release } = await this.source.open(name);
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      const encoder = encoding.createEncoder();
      syncProtocol.writeUpdate(encoder, update);
      this.#send(FrameKind.sync, name, encoding.toUint8Array(encoder));
    };
    doc.on("update", onUpdate);
    this.#served.set(name, { doc, release, onUpdate });
  }

  async #sync(name: string, body: Uint8Array) {
    const opened = !this.#served.has(name);
    if (opened) await this.#serve(name);
    const served = this.#served.get(name) as Served;
    const encoder = encoding.createEncoder();
    const kind = syncProtocol.readSyncMessage(
      decoding.createDecoder(body),
      encoder,
      served.doc,
      this,
    );
    if (encoding.length(encoder) > 0)
      this.#send(FrameKind.sync, name, encoding.toUint8Array(encoder));
    if (kind === syncProtocol.messageYjsSyncStep2) this.onSynced(name);
    // Ask for what the other side has that this one lacks: edits made while apart.
    if (opened) {
      const ask = encoding.createEncoder();
      syncProtocol.writeSyncStep1(ask, served.doc);
      this.#send(FrameKind.sync, name, encoding.toUint8Array(ask));
    }
  }

  #release(name: string) {
    const served = this.#served.get(name);
    if (!served) return;
    this.#served.delete(name);
    served.doc.off("update", served.onUpdate);
    served.release();
  }

  #send(kind: (typeof FrameKind)[keyof typeof FrameKind], doc: string, body: Uint8Array) {
    this.#link?.send(encodeFrame(this.key, { kind, doc, body }));
  }
}
