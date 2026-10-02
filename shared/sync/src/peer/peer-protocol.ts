import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { Awareness } from "y-protocols/awareness";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import type * as Y from "yjs";

/**
 * What peers say to each other once connected. Text frames carry the
 * handshake; binary frames carry Yjs sync and presence, the same messages
 * y-websocket uses.
 */
export interface Hello {
  type: "hello";
  /** Which invitation this device joined with ("owner" for the sharer). */
  inviteId: string;
  /** The invitation's secret, proving this device was invited. */
  secret: string;
  name: string;
}

export type ControlMessage = Hello | { type: "rejected"; reason: string };

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export function syncStep1(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
}

export function updateMessage(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

export function awarenessMessage(awareness: Awareness, clients: number[]): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, clients));
  return encoding.toUint8Array(encoder);
}

/**
 * Applies a binary message from a peer. Returns a reply to send back, if
 * the protocol calls for one (a sync step 2 answering step 1).
 */
export function readMessage(
  data: Uint8Array,
  doc: Y.Doc,
  awareness: Awareness,
  origin: unknown,
): Uint8Array | null {
  const decoder = decoding.createDecoder(data);
  const kind = decoding.readVarUint(decoder);
  if (kind === MESSAGE_SYNC) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.readSyncMessage(decoder, encoder, doc, origin);
    // Only a header means there's nothing to answer.
    return encoding.length(encoder) > 1 ? encoding.toUint8Array(encoder) : null;
  }
  if (kind === MESSAGE_AWARENESS) {
    awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), origin);
  }
  return null;
}
