import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";

export { bytesToHex, hexToBytes, randomBytes };

/** What each key is for. A key is only ever used for its own purpose. */
export type KeyPurpose =
  | "space-id"
  | "room"
  | "frames"
  | "backup"
  | "media"
  | "session"
  | "direct-signals";

const NONCE = 24;

/** A new root secret for a space, or a session: 32 random bytes. */
export const newSecret = (): Uint8Array => randomBytes(32);

/** A key for one purpose, derived from a secret (HKDF over SHA-256). */
export function deriveKey(secret: Uint8Array, purpose: KeyPurpose, length = 32): Uint8Array {
  return hkdf(sha256, secret, undefined, utf8ToBytes(`notables/${purpose}`), length);
}

/**
 * Names that come from a secret but reveal nothing about it: the space's
 * public id and the room its devices meet in, as hex.
 */
export const spaceIdOf = (root: Uint8Array) => bytesToHex(deriveKey(root, "space-id", 16));
export const roomOf = (secret: Uint8Array) => bytesToHex(deriveKey(secret, "room", 16));

/** Crockford's base32: no I, L, O or U, so it reads aloud and types without mix-ups. */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * The space ID as people see it, the same on every device of the space:
 * twelve characters in three groups, e.g. "7F3K-9QXA-M2PD". It names the
 * space; it never lets anyone in (linking still needs a trusted device).
 */
export function spaceCode(spaceId: string): string {
  const bytes = hexToBytes(spaceId.slice(0, 16));
  let bits = 0;
  let value = 0;
  let code = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && code.length < 12) {
      bits -= 5;
      code += CODE_ALPHABET[(value >> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/** Encrypts with XChaCha20-Poly1305: a random nonce, then the sealed bytes. */
export function seal(key: Uint8Array, plain: Uint8Array): Uint8Array {
  const nonce = randomBytes(NONCE);
  const sealed = xchacha20poly1305(key, nonce).encrypt(plain);
  const out = new Uint8Array(NONCE + sealed.length);
  out.set(nonce);
  out.set(sealed, NONCE);
  return out;
}

/** Decrypts what `seal` made, or null if it was altered or sealed with another key. */
export function open(key: Uint8Array, data: Uint8Array): Uint8Array | null {
  if (data.length <= NONCE) return null;
  try {
    return xchacha20poly1305(key, data.subarray(0, NONCE)).decrypt(data.subarray(NONCE));
  } catch {
    return null;
  }
}

export function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

export function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}
