import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { open, seal } from "../space/space-keys";

/**
 * What a browser and its phone say to each other, one sealed frame at a
 * time. Every frame names the document it is about, so one connection
 * carries the library and every note that is open.
 */
export const FrameKind = {
  /** A y-protocols sync message (step 1, step 2 or an update) for a document. */
  sync: 0,
  /** The browser closed a document; the phone stops sending its changes. */
  close: 1,
  /** A document was erased for good. */
  remove: 2,
  /** A small JSON message that is not about a document. */
  control: 3,
  /** Media bytes, permitted only on a direct connection. */
  media: 4,
} as const;

export type FrameKindValue = (typeof FrameKind)[keyof typeof FrameKind];

export interface Frame {
  kind: FrameKindValue;
  /** The document's storage name, e.g. "library" or "note:0193…". */
  doc: string;
  body: Uint8Array;
}

export function encodeFrame(key: Uint8Array, frame: Frame): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeUint8(encoder, frame.kind);
  encoding.writeVarString(encoder, frame.doc);
  encoding.writeVarUint8Array(encoder, frame.body);
  return seal(key, encoding.toUint8Array(encoder));
}

/** The frame inside, or null when it was not sealed with this session's key. */
export function decodeFrame(key: Uint8Array, data: Uint8Array): Frame | null {
  const plain = open(key, data);
  if (!plain) return null;
  try {
    const decoder = decoding.createDecoder(plain);
    const kind = decoding.readUint8(decoder) as FrameKindValue;
    const doc = decoding.readVarString(decoder);
    const body = decoding.readVarUint8Array(decoder);
    return { kind, doc, body };
  } catch {
    return null;
  }
}

/** Where frames go: a data channel, or anything else that delivers bytes in order. */
export interface FrameLink {
  send(data: Uint8Array): void | Promise<void>;
  /** Relays explicitly disable media. Direct links permit it. */
  media?: boolean;
}

const text = new TextEncoder();
const read = new TextDecoder();

export const controlBody = (message: unknown) => text.encode(JSON.stringify(message));

export function readControl<T>(body: Uint8Array): T | null {
  try {
    return JSON.parse(read.decode(body)) as T;
  } catch {
    return null;
  }
}
