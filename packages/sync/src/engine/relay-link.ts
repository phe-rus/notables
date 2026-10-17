import type { FrameLink } from "../session/session-frames";
import { fromBase64, toBase64 } from "../space/space-keys";

/**
 * The room passes strings up to 256 KB, so a sealed frame travels as base64
 * in pieces of at most this many bytes, reassembled on arrival.
 */
const PIECE = 96 * 1024;

interface Piece {
  /** Which frame this piece belongs to, per sender. */
  f: number;
  /** Its place, and how many pieces make the frame. */
  i: number;
  n: number;
  d: string;
}

/**
 * Frames between two devices through their space's room (the pass-through
 * rung of AC-9). The frames are already sealed; the room sees only pieces of
 * ciphertext addressed to a device id.
 */
export class RelayLink implements FrameLink {
  readonly media = false;
  #next = 0;
  #partial = new Map<number, string[]>();

  constructor(private readonly post: (body: string) => void) {}

  send(data: Uint8Array) {
    const frame = this.#next++;
    const count = Math.max(1, Math.ceil(data.length / PIECE));
    for (let index = 0; index < count; index++) {
      const piece: Piece = {
        f: frame,
        i: index,
        n: count,
        d: toBase64(data.subarray(index * PIECE, (index + 1) * PIECE)),
      };
      this.post(JSON.stringify(piece));
    }
  }

  /** A piece arrived; returns the whole frame once its last piece is in. */
  receive(body: string): Uint8Array | null {
    let piece: Piece;
    try {
      piece = JSON.parse(body) as Piece;
    } catch {
      return null;
    }
    if (typeof piece?.d !== "string" || !(piece.n >= 1) || !(piece.i < piece.n)) return null;
    if (piece.n === 1) return fromBase64(piece.d);
    const parts = this.#partial.get(piece.f) ?? new Array<string>(piece.n);
    parts[piece.i] = piece.d;
    this.#partial.set(piece.f, parts);
    if (parts.filter((part) => part !== undefined).length < piece.n) return null;
    this.#partial.delete(piece.f);
    const chunks = parts.map(fromBase64);
    const whole = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let at = 0;
    for (const chunk of chunks) {
      whole.set(chunk, at);
      at += chunk.length;
    }
    return whole;
  }
}
