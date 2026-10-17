import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import type * as Y from "yjs";
import type { PeerMedia } from "../peer/media-exchange";
import { mediaReferences } from "../peer/media-references";
import {
  controlBody,
  decodeFrame,
  encodeFrame,
  FrameKind,
  type FrameKindValue,
  type FrameLink,
  readControl,
} from "./session-frames";
import { SessionMedia } from "./session-media";
import { SessionRequests } from "./session-rpc";

interface Open {
  doc: Y.Doc;
  /** How many bindings hold it; it closes when the last lets go (editors remount). */
  holders: number;
  onUpdate(update: Uint8Array, origin: unknown): void;
  loaded: Promise<void>;
  markLoaded(): void;
}

/**
 * The browser's side of a session: documents live in memory only, filled
 * from the phone and sent back to it as they change. While the phone is
 * away, edits wait in memory and go across when it returns.
 */
export class SessionClient {
  #link: FrameLink | null = null;
  #media: SessionMedia | null = null;
  #requests = new SessionRequests((message) => this.sendControl(message));

  request(method: string, input: unknown): Promise<unknown> {
    if (!this.connected) return Promise.reject(new Error("Phone disconnected"));
    return this.#requests.request(method, input);
  }

  shareMedia(media: PeerMedia, arrived: (id: string) => void = () => {}) {
    this.#media?.detach();
    this.#requests.detach();
    this.#media = new SessionMedia(
      media,
      () => [...this.#open.values()].flatMap(({ doc }) => mediaReferences(doc)),
      (body) => this.#send(FrameKind.media, "", body),
      arrived,
    );
    this.#media.attach(this.#link !== null && this.#link.media !== false);
  }
  #open = new Map<string, Open>();

  constructor(
    private readonly key: Uint8Array,
    private readonly onControl: (message: unknown) => void = () => {},
  ) {}

  get connected() {
    return this.#link !== null;
  }

  /** Connected: catch up on every open document, both ways. */
  attach(link: FrameLink) {
    this.#link = link;
    this.#media?.attach(link.media !== false);
    for (const [name, open] of this.#open) this.#step1(name, open.doc);
  }

  detach() {
    this.#link = null;
    this.#media?.detach();
    this.#requests.detach();
  }

  /** Fills `doc` from the phone and keeps it in step; resolves once its content is in. */
  open(name: string, doc: Y.Doc): Promise<void> {
    const existing = this.#open.get(name);
    if (existing?.doc === doc) {
      existing.holders += 1;
      return existing.loaded;
    }
    if (existing) this.#drop(name);
    let markLoaded = () => {};
    const loaded = new Promise<void>((resolve) => {
      markLoaded = resolve;
    });
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      const encoder = encoding.createEncoder();
      syncProtocol.writeUpdate(encoder, update);
      this.#send(FrameKind.sync, name, encoding.toUint8Array(encoder));
      this.#media?.refresh();
    };
    doc.on("update", onUpdate);
    this.#open.set(name, { doc, holders: 1, onUpdate, loaded, markLoaded });
    this.#step1(name, doc);
    return loaded;
  }

  /** Lets go of one hold on a document; the phone is told once nobody holds it. */
  close(name: string) {
    const open = this.#open.get(name);
    if (!open) return;
    open.holders -= 1;
    if (open.holders <= 0) this.#drop(name);
  }

  #drop(name: string) {
    const open = this.#open.get(name);
    if (!open) return;
    this.#open.delete(name);
    open.doc.off("update", open.onUpdate);
    this.#send(FrameKind.close, name, new Uint8Array());
  }

  remove(name: string) {
    this.#drop(name);
    this.#send(FrameKind.remove, name, new Uint8Array());
  }

  sendControl(message: unknown) {
    this.#send(FrameKind.control, "", controlBody(message));
  }

  receive(data: Uint8Array) {
    const frame = decodeFrame(this.key, data);
    if (!frame) return;
    if (frame.kind === FrameKind.media) {
      this.#media?.receive(frame.body);
      return;
    }
    if (frame.kind === FrameKind.control) {
      const message = readControl(frame.body);
      if (message && !this.#requests.receive(message)) this.onControl(message);
      return;
    }
    const open = this.#open.get(frame.doc);
    if (frame.kind !== FrameKind.sync || !open) return;
    const encoder = encoding.createEncoder();
    const type = syncProtocol.readSyncMessage(
      decoding.createDecoder(frame.body),
      encoder,
      open.doc,
      this,
    );
    if (encoding.length(encoder) > 0) {
      this.#send(FrameKind.sync, frame.doc, encoding.toUint8Array(encoder));
    }
    this.#media?.refresh();
    if (type === syncProtocol.messageYjsSyncStep2) open.markLoaded();
  }

  #step1(name: string, doc: Y.Doc) {
    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, doc);
    this.#send(FrameKind.sync, name, encoding.toUint8Array(encoder));
  }

  #send(kind: FrameKindValue, doc: string, body: Uint8Array) {
    return this.#link?.send(encodeFrame(this.key, { kind, doc, body }));
  }
}
