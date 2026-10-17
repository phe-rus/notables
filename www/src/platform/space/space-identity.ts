import {
  bytesToHex,
  devicePublicKey,
  hexToBytes,
  newSecret,
  spaceCode,
  spaceIdOf,
} from "@notables/sync";
import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";
import { isTauri } from "../runtime";

/**
 * The person's private space (spec 0005, AC-1): a root secret only their own
 * devices hold, and an ID derived from it that every one of them shows.
 * Apps create it on first launch without asking; the web never holds it.
 */
export interface Space {
  /** 32 hex characters, derived from the root secret. */
  id: string;
  /** The same ID as people read it: "7F3K-9QXA-M2PD". */
  code: string;
}

/**
 * The space ID (not the secret) this device last had. A key store that fails
 * to answer must never look like "no space yet", or a new secret would
 * replace the real one.
 */
const KNOWN_KEY = "notables:space-id";

let root: Uint8Array | null = null;
let device: { secret: Uint8Array; publicKey: string } | null = null;
let space: Space | null = null;
let starting: Promise<Space | null> | null = null;
const listeners = new Set<() => void>();

function set(next: Uint8Array) {
  root = next;
  const id = spaceIdOf(next);
  space = { id, code: spaceCode(id) };
  try {
    localStorage.setItem(KNOWN_KEY, id);
  } catch {
    // Only a guard; the secret itself is in the key store.
  }
  for (const listener of listeners) listener();
}

async function readRoot(): Promise<Uint8Array | null> {
  const stored = await invoke<string | null>("space_root_read").catch(() => null);
  return stored ? hexToBytes(stored) : null;
}

/** Only the system key store holds the secret; there is no weaker fallback. */
async function keepRoot(secret: Uint8Array) {
  await invoke("space_root_write", { secret: bytesToHex(secret) });
}

/**
 * This device's space, created the first time; null on the web, and on a
 * device without a key store (it works alone, but can't link). Call after mount.
 */
export function startSpace(): Promise<Space | null> {
  if (!isTauri()) return Promise.resolve(null);
  starting ??= (async () => {
    const own = await invoke<string>("space_device_secret").catch(() => null);
    if (own) {
      const secret = hexToBytes(own);
      device = { secret, publicKey: devicePublicKey(secret) };
    }
    const existing = await readRoot();
    if (existing) {
      set(existing);
      return space;
    }
    // This device had a space, but the key store didn't answer: try next launch.
    if (localStorage.getItem(KNOWN_KEY)) return null;
    const secret = newSecret();
    try {
      await keepRoot(secret);
    } catch {
      return null;
    }
    set(secret);
    return space;
  })();
  return starting;
}

/** The root secret, for the keys linking and sync derive from it. */
export function spaceRoot(): Uint8Array | null {
  return root;
}

/**
 * This device's own key pair (spec 0005, AC-12): others seal a rotated root
 * secret for its public key. Null without a key store.
 */
export function deviceKey(): { secret: Uint8Array; publicKey: string } | null {
  return device;
}

/** Joins another space when this device is linked to it: its secret replaces ours. */
export async function adoptSpace(secret: Uint8Array): Promise<void> {
  await keepRoot(secret);
  set(secret);
}

/**
 * The space shown in a browser, as its phone reported it. Held in memory
 * only, like everything else a browser learns from its phone.
 */
export function showPhoneSpace(code: string) {
  if (space?.code === code) return;
  space = { id: "", code };
  for (const listener of listeners) listener();
}

export function useSpace(): Space | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => space,
    () => null,
  );
}
