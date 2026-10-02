/**
 * Small Web Crypto helpers for sharing: random tokens, hashes, and
 * AES-GCM so the signalling server only ever sees ciphertext.
 */

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function randomToken(bytes = 16): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const keys = new Map<string, Promise<CryptoKey>>();

function aesKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey("raw", fromBase64Url(secret), "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
    keys.set(secret, key);
  }
  return key;
}

/** A fresh 256-bit key, as text for a link. */
export const newShareKey = () => randomToken(32);

export async function encryptJson(secret: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), data),
  );
  return `${toBase64Url(iv)}.${toBase64Url(sealed)}`;
}

/** Null when the message wasn't sealed with this key. */
export async function decryptJson<T>(secret: string, text: string): Promise<T | null> {
  try {
    const [iv, sealed] = text.split(".");
    if (!iv || !sealed) return null;
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(iv) },
      await aesKey(secret),
      fromBase64Url(sealed),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}
