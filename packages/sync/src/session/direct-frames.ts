const MAGIC = new Uint8Array([78, 84, 66, 76, 67, 72, 75, 49]);
const HEADER = 20;
const PIECE = 48 * 1024;
const MAX_FRAME = 32 * 1024 * 1024;

export function* directPieces(data: Uint8Array, id: number): Generator<Uint8Array> {
  if (data.length <= PIECE) {
    yield data;
    return;
  }
  if (data.length > MAX_FRAME) throw new Error("Direct frame too large");
  for (let offset = 0; offset < data.length; offset += PIECE) {
    const bytes = data.subarray(offset, offset + PIECE);
    const frame = new Uint8Array(HEADER + bytes.length);
    frame.set(MAGIC);
    const header = new DataView(frame.buffer);
    header.setUint32(8, id);
    header.setUint32(12, data.length);
    header.setUint32(16, offset);
    frame.set(bytes, HEADER);
    yield frame;
  }
}
/** Ordered channels need at most one bounded assembly per sending link. */
export class DirectFrames {
  #partial: { id: number; bytes: Uint8Array; offset: number } | null = null;
  receive(data: Uint8Array): Uint8Array | null {
    if (!MAGIC.every((byte, index) => data[index] === byte)) return data;
    if (data.length < HEADER) return null;
    const header = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const id = header.getUint32(8);
    const total = header.getUint32(12);
    const offset = header.getUint32(16);
    if (total > MAX_FRAME || data.length > PIECE + HEADER || offset + data.length - HEADER > total)
      return null;
    if (offset === 0) this.#partial = { id, bytes: new Uint8Array(total), offset: 0 };
    const partial = this.#partial;
    if (
      !partial ||
      partial.id !== id ||
      partial.bytes.length !== total ||
      partial.offset !== offset
    ) {
      this.#partial = null;
      return null;
    }
    partial.bytes.set(data.subarray(HEADER), offset);
    partial.offset += data.length - HEADER;
    if (partial.offset !== total) return null;
    this.#partial = null;
    return partial.bytes;
  }
}
