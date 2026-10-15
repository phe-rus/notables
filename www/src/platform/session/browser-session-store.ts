import { bytesToHex, hexToBytes } from "@notables/sync";
import { isTauri } from "../runtime";

/**
 * What a browser keeps once a phone approves it: which phone, and the
 * session key. Never any notes; those stay on the phone (spec 0005, AC-22).
 */
export interface BrowserSession {
  phoneId: string;
  phoneName: string;
  /** This browser's id in the session room. */
  browserId: string;
  key: Uint8Array;
  pairedAt: number;
}

const KEY = "notables:browser-session";

interface Saved {
  phoneId: string;
  phoneName: string;
  browserId: string;
  key: string;
  pairedAt: number;
}

let cached: BrowserSession | null | undefined;

export function browserSession(): BrowserSession | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (isTauri() || typeof localStorage === "undefined") return cached;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    if (saved?.key && saved.phoneId && saved.browserId) {
      cached = { ...saved, key: hexToBytes(saved.key) };
    }
  } catch {
    // A damaged record is no session.
  }
  return cached;
}

/** Whether this is a browser showing a phone's notes. */
export const inBrowserSession = () => browserSession() !== null;

export function saveBrowserSession(session: BrowserSession) {
  const saved: Saved = { ...session, key: bytesToHex(session.key) };
  localStorage.setItem(KEY, JSON.stringify(saved));
  cached = session;
}

/** Log Out: the key goes, and with it any way back to the phone. */
export function clearBrowserSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
  cached = null;
}
