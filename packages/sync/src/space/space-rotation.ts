import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import {
  bytesToHex,
  fromBase64,
  hexToBytes,
  newSecret,
  open,
  randomBytes,
  seal,
  spaceIdOf,
  toBase64,
} from "./space-keys";

/**
 * Removing a device (spec 0005, AC-12): the device that removes another makes
 * a new root secret and seals it for each device that stays, with that
 * device's own X25519 key. The removed device still holds the old secret, so
 * nothing about the new one may come from the old secret alone.
 */
export interface RotationNotice {
  /** The space id being left. */
  from: string;
  /** The space id of the new secret, which every envelope must open to. */
  to: string;
  /** The device that removed the others; envelopes prove they came from its key. */
  by: string;
  removed: string[];
  /** Device id to its sealed copy of the new secret. */
  envelopes: Record<string, string>;
  at: number;
}

/** A device's own key pair, from 32 secret bytes kept in its key store. */
export function devicePublicKey(secret: Uint8Array): string {
  return bytesToHex(x25519.getPublicKey(secret));
}

function envelopeKey(shared: Uint8Array, notice: Pick<RotationNotice, "from" | "to">, to: string) {
  return hkdf(
    sha256,
    shared,
    undefined,
    utf8ToBytes(`notables/rotation/${notice.from}/${notice.to}/${to}`),
    32,
  );
}

/**
 * A new root secret for everyone but the removed devices. Only devices with a
 * known public key can receive it; the rest must be linked again.
 */
export function rotateSpace(
  oldRoot: Uint8Array,
  me: { id: string; secret: Uint8Array },
  stay: { id: string; key: string }[],
  removed: string[],
): { root: Uint8Array; notice: RotationNotice } {
  const root = newSecret();
  const notice: RotationNotice = {
    from: spaceIdOf(oldRoot),
    to: spaceIdOf(root),
    by: me.id,
    removed,
    envelopes: {},
    at: Date.now(),
  };
  for (const device of stay) {
    if (removed.includes(device.id) || device.id === me.id) continue;
    const ephemeral = randomBytes(32);
    const theirs = hexToBytes(device.key);
    // Ephemeral for secrecy, static so the envelope proves its sender.
    const shared = concatBytes(
      x25519.getSharedSecret(ephemeral, theirs),
      x25519.getSharedSecret(me.secret, theirs),
    );
    const sealed = seal(envelopeKey(shared, notice, device.id), root);
    notice.envelopes[device.id] =
      `${bytesToHex(x25519.getPublicKey(ephemeral))}.${toBase64(sealed)}`;
  }
  return { root, notice };
}

/**
 * The new root secret from a notice meant for this device, or null when it
 * isn't for this space, wasn't sealed for this device by the claimed sender
 * (whose key this device already knows), or doesn't open to the promised space.
 */
export function acceptRotation(
  notice: RotationNotice,
  me: { id: string; secret: Uint8Array },
  currentSpace: string,
  senderKey: string | undefined,
): Uint8Array | null {
  if (notice.from !== currentSpace || !senderKey || notice.removed.includes(me.id)) return null;
  const envelope = notice.envelopes[me.id];
  const [ephemeral, sealed] = envelope?.split(".") ?? [];
  if (!ephemeral || !sealed) return null;
  try {
    const shared = concatBytes(
      x25519.getSharedSecret(me.secret, hexToBytes(ephemeral)),
      x25519.getSharedSecret(me.secret, hexToBytes(senderKey)),
    );
    const root = open(envelopeKey(shared, notice, me.id), fromBase64(sealed));
    return root && root.length === 32 && spaceIdOf(root) === notice.to ? root : null;
  } catch {
    return null;
  }
}

/** A notice as it arrives from the room, checked for shape only. */
export function readRotationNotice(text: string): RotationNotice | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object") return null;
    const notice = value as RotationNotice;
    const ids = (list: unknown) =>
      Array.isArray(list) && list.length <= 100 && list.every((id) => typeof id === "string");
    if (
      typeof notice.from !== "string" ||
      typeof notice.to !== "string" ||
      typeof notice.by !== "string" ||
      typeof notice.at !== "number" ||
      !ids(notice.removed) ||
      !notice.envelopes ||
      typeof notice.envelopes !== "object" ||
      Object.keys(notice.envelopes).length > 100 ||
      !Object.values(notice.envelopes).every((item) => typeof item === "string")
    )
      return null;
    return notice;
  } catch {
    return null;
  }
}
