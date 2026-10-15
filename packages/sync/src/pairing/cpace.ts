import { ristretto255, ristretto255_hasher } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { concatBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { PAIRING_WORDS } from "./pairing-words";

/*
 * CPace (draft-irtf-cfrg-cpace) over ristretto255: two devices that know
 * the same short code agree on a strong key, and anyone who does not know
 * the code learns nothing they could test guesses against offline. Each
 * wrong guess costs a live attempt, which the new device limits.
 */

const DST = utf8ToBytes("notables/cpace/ristretto255");

/** The code's own point: only someone who knows the code can compute it. */
function generator(code: string, sessionId: Uint8Array) {
  return ristretto255_hasher.hashToCurve(
    concatBytes(utf8ToBytes("CPace"), utf8ToBytes(normalizeCode(code)), sessionId),
    { DST },
  );
}

export type CPaceRole = "initiator" | "responder";

/** One side of a pairing exchange. Send `share`, then `finish` with the other's. */
export class CPace {
  readonly share: Uint8Array;
  readonly #scalar: bigint;

  constructor(
    code: string,
    private readonly sessionId: Uint8Array,
    private readonly role: CPaceRole,
  ) {
    this.#scalar = ristretto255_hasher.hashToScalar(randomBytes(64), { DST });
    this.share = generator(code, sessionId).multiply(this.#scalar).toBytes();
  }

  /** The shared key, or null when the other share is not a valid point. */
  finish(theirs: Uint8Array): PairingKeys | null {
    let point: InstanceType<typeof ristretto255.Point>;
    try {
      point = ristretto255.Point.fromBytes(theirs);
    } catch {
      return null;
    }
    if (point.is0()) return null;
    const shared = point.multiply(this.#scalar).toBytes();
    const [first, second] = this.role === "initiator" ? [this.share, theirs] : [theirs, this.share];
    const isk = sha512(
      concatBytes(utf8ToBytes("CPace-ISK"), this.sessionId, shared, first, second),
    );
    return new PairingKeys(isk);
  }
}

const derive = (isk: Uint8Array, label: string, length = 32) =>
  hkdf(sha256, isk, undefined, utf8ToBytes(`notables/pairing/${label}`), length);

/** What a finished exchange gives both sides. */
export class PairingKeys {
  constructor(private readonly isk: Uint8Array) {}

  /** Proves to the other side that this one used the same code. */
  tag(role: CPaceRole): Uint8Array {
    return hmac(sha256, derive(this.isk, "confirm"), utf8ToBytes(role));
  }

  /** Checks the other side's tag, in constant time. */
  verify(role: CPaceRole, tag: Uint8Array): boolean {
    const expected = this.tag(role);
    if (tag.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < tag.length; i++) difference |= (tag[i] ?? 0) ^ (expected[i] ?? 0);
    return difference === 0;
  }

  /** Four words both screens show, so a person can see they match. */
  words(): string[] {
    return [...derive(this.isk, "words", 4)].map((byte) => PAIRING_WORDS[byte] ?? "");
  }

  /** The key the paired devices keep using afterwards. */
  sessionKey(): Uint8Array {
    return derive(this.isk, "session");
  }
}

/** Letters and digits nobody misreads: no I, L, O, 0 or 1. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;

/** A fresh pairing code, e.g. "K7QM4TXA". */
export function newPairingCode(): string {
  const bytes = randomBytes(CODE_LENGTH * 2);
  let code = "";
  for (let i = 0; code.length < CODE_LENGTH && i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    // Skip the top of the range so every letter is equally likely.
    if (byte < 248) code += ALPHABET[byte % ALPHABET.length];
  }
  return code.length === CODE_LENGTH ? code : newPairingCode();
}

/** A typed code as entered, made comparable: capitals, no spaces or dashes. */
export function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const isPairingCode = (text: string) =>
  new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`).test(normalizeCode(text));

/**
 * Where a code's pairing waits on the server: a hash of its first four
 * characters, so a typed code finds it without the server learning the
 * code. Several pairings may share a room; the exchange keeps them apart.
 */
export function pairingRoom(code: string): string {
  const digest = sha256(utf8ToBytes(`notables/pair/${normalizeCode(code).slice(0, 4)}`));
  return [...digest.subarray(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
