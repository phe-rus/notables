import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

/** Binary frame kinds, after Yjs sync (0) and awareness (1). */
const MEDIA_REQUEST = 2;
const MEDIA_CHUNK = 3;
const MEDIA_MISSING = 4;

/** Small enough for every WebRTC implementation to pass in one message. */
export const MEDIA_CHUNK_BYTES = 16 * 1024;
/** Nothing larger than this is accepted from another device. */
const MAX_BYTES = 512 * 1024 * 1024;
/** Kinds of file a note can hold: photos, recordings, videos, drawing scenes. */
const ALLOWED_TYPE =
  /^(?:image|audio|video)\/[\w.+-]+$|^application\/(?:json|pdf|octet-stream|zip|msword|vnd\.[\w.+-]+)$|^text\/(?:plain|csv|markdown)$/;
/** A request with no answer is asked again after this long. */
const RETRY_AFTER = 60_000;

/** Where this device keeps media files, by id. */
export interface PeerMedia {
  has(id: string): Promise<boolean>;
  read(id: string): Promise<Blob | null>;
  write(id: string, file: Blob): Promise<void>;
}

/** Whether a binary frame belongs to the media exchange. */
export function isMediaFrame(data: Uint8Array): boolean {
  if (data.length === 0) return false;
  const kind = decoding.readVarUint(decoding.createDecoder(data));
  return kind === MEDIA_REQUEST || kind === MEDIA_CHUNK || kind === MEDIA_MISSING;
}

function frame(kind: number, id: string, write?: (encoder: encoding.Encoder) => void) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, kind);
  encoding.writeVarString(encoder, id);
  write?.(encoder);
  return encoding.toUint8Array(encoder);
}

interface Incoming {
  type: string;
  total: number;
  received: number;
  parts: Uint8Array[];
}

/**
 * Moves the files a shared document refers to (photos, recordings,
 * drawings) between devices, so each one can show them. A device asks for
 * the files it lacks; another sends one only if the document refers to it,
 * so joining a note never exposes anything else on the device. Files arrive
 * in order, in small pieces, and keep their id.
 */
export class MediaExchange {
  #asked = new Map<string, { peer: string; at: number; tried: Set<string> }>();
  #incoming = new Map<string, Incoming>();
  /** Ids known to be on this device, so they aren't looked up again. */
  #present = new Set<string>();

  constructor(
    private readonly media: PeerMedia,
    /** The ids the document refers to right now. */
    private readonly referenced: () => Iterable<string>,
    private readonly send: (peer: string, data: Uint8Array) => Promise<void> | void,
    /** Called once a file has arrived and been stored. */
    private readonly arrived: (id: string) => void = () => {},
  ) {}

  disconnect(peer: string) {
    for (const [id, request] of this.#asked)
      if (request.peer === peer) {
        this.#asked.delete(id);
        this.#incoming.delete(id);
      }
  }

  /** Asks connected peers for every referenced file this device lacks. */
  async fetchMissing(peers: readonly string[]) {
    if (peers.length === 0) return;
    for (const id of this.referenced()) {
      if (this.#present.has(id) || this.#incoming.has(id)) continue;
      const asked = this.#asked.get(id);
      if (asked && Date.now() - asked.at < RETRY_AFTER) continue;
      if (await this.media.has(id)) {
        this.#present.add(id);
        continue;
      }
      const tried = asked?.tried ?? new Set<string>();
      const peer = peers.find((each) => !tried.has(each)) ?? (peers[0] as string);
      tried.add(peer);
      this.#asked.set(id, { peer, at: Date.now(), tried });
      await this.send(peer, frame(MEDIA_REQUEST, id));
    }
  }

  async receive(peer: string, data: Uint8Array, peers: readonly string[]) {
    const decoder = decoding.createDecoder(data);
    const kind = decoding.readVarUint(decoder);
    const id = decoding.readVarString(decoder);
    if (kind === MEDIA_REQUEST) return this.#serve(peer, id);
    if (kind === MEDIA_MISSING) {
      const asked = this.#asked.get(id);
      // Another device may have it; ask one that hasn't been asked yet.
      if (asked?.peer === peer && peers.some((each) => !asked.tried.has(each))) {
        asked.at = 0;
        await this.fetchMissing(peers);
      }
      return;
    }
    if (kind !== MEDIA_CHUNK) return;
    const type = decoding.readVarString(decoder);
    const total = decoding.readVarUint(decoder);
    const offset = decoding.readVarUint(decoder);
    const bytes = decoding.readVarUint8Array(decoder);
    // Only files this device asked that device for, of the kinds notes hold.
    if (this.#asked.get(id)?.peer !== peer) return;
    if (total > MAX_BYTES || !ALLOWED_TYPE.test(type)) return this.#forget(id);
    let incoming = this.#incoming.get(id);
    if (!incoming && offset === 0) {
      incoming = { type, total, received: 0, parts: [] };
      this.#incoming.set(id, incoming);
    }
    if (!incoming || offset !== incoming.received || incoming.received + bytes.length > total) {
      return this.#forget(id);
    }
    incoming.parts.push(bytes);
    incoming.received += bytes.length;
    if (incoming.received < total) return;
    this.#incoming.delete(id);
    this.#asked.delete(id);
    await this.media.write(id, new Blob(incoming.parts as BlobPart[], { type: incoming.type }));
    this.#present.add(id);
    this.arrived(id);
  }

  /** Drops a broken transfer, so the file is asked for again later. */
  #forget(id: string) {
    this.#incoming.delete(id);
    const asked = this.#asked.get(id);
    if (asked) asked.at = 0;
  }

  async #serve(peer: string, id: string) {
    const allowed = new Set(this.referenced()).has(id);
    const file = allowed && (await this.media.has(id)) ? await this.media.read(id) : null;
    if (!file || file.size > MAX_BYTES || !ALLOWED_TYPE.test(file.type)) {
      await this.send(peer, frame(MEDIA_MISSING, id));
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    for (let offset = 0; offset === 0 || offset < bytes.length; offset += MEDIA_CHUNK_BYTES) {
      const piece = bytes.subarray(offset, offset + MEDIA_CHUNK_BYTES);
      await this.send(
        peer,
        frame(MEDIA_CHUNK, id, (encoder) => {
          encoding.writeVarString(encoder, file.type);
          encoding.writeVarUint(encoder, bytes.length);
          encoding.writeVarUint(encoder, offset);
          encoding.writeVarUint8Array(encoder, piece);
        }),
      );
    }
  }
}
