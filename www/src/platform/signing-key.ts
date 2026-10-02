import {
  createSigningKey,
  fromBase64Url,
  issuerIdFor,
  type SigningKey,
  signingKeyFromSecret,
  toBase64Url,
} from "@notables/core";
import { isTauri } from "./runtime";
import { nativeStorage } from "./storage/backends/native/native-commands";

/**
 * This device's signing key for sealing invoices and receipts. Created once;
 * its issuer ID is how readers recognise documents from this device, so it
 * lives in native storage in the apps rather than in clearable web storage.
 */
const STORAGE_KEY = "notables:signing-key";

let key: Promise<SigningKey> | undefined;

async function readStored(): Promise<string | null> {
  if (isTauri()) return nativeStorage.meta(STORAGE_KEY);
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function store(secret: string): Promise<void> {
  if (isTauri()) return nativeStorage.setMeta(STORAGE_KEY, secret);
  localStorage.setItem(STORAGE_KEY, secret);
}

export function getSigningKey(): Promise<SigningKey> {
  key ??= (async () => {
    const stored = await readStored();
    if (stored) return signingKeyFromSecret(fromBase64Url(stored));
    const created = createSigningKey();
    await store(toBase64Url(created.secretKey));
    return created;
  })();
  return key;
}

export async function getIssuerId(): Promise<string> {
  return issuerIdFor((await getSigningKey()).publicKey);
}
