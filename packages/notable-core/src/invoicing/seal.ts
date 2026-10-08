import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { InvoiceDocument, InvoiceKind } from "./invoice";
import { computeTotals } from "./totals";

/**
 * A seal proves who issued a document and that it hasn't changed. It is a
 * signed summary (issuer, number, dates, client, totals and a hash of the
 * full contents), small enough for a QR code. Anyone can check it offline
 * with the issuer's public key, which travels inside the seal; the issuer
 * ID derived from that key is what people compare to know who signed.
 *
 * Encoded as `<summary>.<signature>.<public key>`, each base64url.
 */
export interface SealSummary {
  /** Format version. */
  v: 1;
  kind: InvoiceKind;
  /** Document number. */
  no: string;
  /** Issuer and client names. */
  from: string;
  to: string;
  /** Issue and due dates, YYYY-MM-DD. */
  on: string;
  due: string | null;
  cur: string;
  /** Total and tax, in minor units. */
  total: number;
  tax: number;
  /** Number of line items. */
  items: number;
  /** SHA-256 of the canonical contents, base64url. */
  hash: string;
}

export type SealCheck =
  | { valid: true; summary: SealSummary; issuerId: string; publicKey: string }
  | { valid: false; reason: SealFailure; summary?: SealSummary; issuerId?: string };

export type SealFailure = "malformed" | "unsupported" | "signature";

const DOMAIN = "notables-seal-v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// base64url without padding, in any JS runtime.
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error("Not base64url");
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** JSON with sorted keys and no undefined values, so equal data hashes equally. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

/** What is signed: the document's meaning, not its look or bookkeeping. */
export function signedContents(invoice: InvoiceDocument) {
  return {
    kind: invoice.kind,
    number: invoice.number.trim(),
    currency: invoice.currency,
    issuedOn: invoice.issuedOn,
    dueOn: invoice.dueOn,
    issuer: invoice.issuer,
    client: invoice.client,
    items: invoice.items.map(({ description, quantity, unitPrice }) => ({
      description: description.trim(),
      quantity,
      unitPrice,
    })),
    taxRate: invoice.taxRate,
    discount: invoice.discount,
    notes: invoice.notes.trim(),
    paymentDetails: invoice.paymentDetails.trim(),
  };
}

export function contentHash(invoice: InvoiceDocument): string {
  return toBase64Url(sha256(encoder.encode(canonicalJson(signedContents(invoice)))));
}

export function summarizeForSeal(invoice: InvoiceDocument): SealSummary {
  const totals = computeTotals(invoice);
  return {
    v: 1,
    kind: invoice.kind,
    no: invoice.number.trim(),
    from: invoice.issuer.name.trim(),
    to: invoice.client.name.trim(),
    on: invoice.issuedOn,
    due: invoice.dueOn,
    cur: invoice.currency,
    total: totals.total,
    tax: totals.tax,
    items: invoice.items.length,
    hash: contentHash(invoice),
  };
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * A short, readable fingerprint of an issuer's public key, e.g.
 * "7F3A-91C2-K8QZ-M2PD". Printed on documents and compared by readers.
 */
export function issuerIdFor(publicKey: Uint8Array): string {
  return grouped(crockford(sha256(publicKey).subarray(0, 10)));
}

/** Crockford base32: no I, L, O or U, so it reads aloud and types cleanly. */
function crockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}

const grouped = (text: string) => text.match(/.{4}/g)?.join("-") ?? text;

/**
 * A short code printed beside the document number, e.g. "7KQ2-MX9D". With
 * the number, it lets an issuer confirm a paper copy by typing it in, no
 * camera needed. Signatures are deterministic, so it only changes when the
 * signed contents do.
 */
export function checkCodeFor(seal: string): string {
  return grouped(crockford(sha256(encoder.encode(`check:${seal}`)).subarray(0, 5)));
}

/** Normalises a typed check code: case, spaces, dashes and look-alike letters. */
export function normalizeCheckCode(text: string): string {
  const clean = text.toUpperCase().replace(/[\s-]/g, "").replace(/[IL]/g, "1").replace(/O/g, "0");
  return grouped(clean);
}

/** Prefix of the hidden mark's text, so scanners can tell it from other codes. */
export const HIDDEN_MARK_PREFIX = "NTM1:";

/**
 * The text of the faint mark printed into a document, readable by a camera
 * but hard to see. It is derived from the seal, so a copy that was retyped,
 * regenerated or edited carries no mark, or one that doesn't match.
 */
export function hiddenMarkFor(seal: string): string {
  return HIDDEN_MARK_PREFIX + crockford(sha256(encoder.encode(`mark:${seal}`)).subarray(0, 15));
}

export interface SigningKey {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
}

export function createSigningKey(): SigningKey {
  const secretKey = ed25519.utils.randomSecretKey();
  return { secretKey, publicKey: ed25519.getPublicKey(secretKey) };
}

export function signingKeyFromSecret(secretKey: Uint8Array): SigningKey {
  return { secretKey, publicKey: ed25519.getPublicKey(secretKey) };
}

/** Signs the document's summary and returns the encoded seal. */
export function createSeal(invoice: InvoiceDocument, key: SigningKey): string {
  const summary = toBase64Url(encoder.encode(canonicalJson(summarizeForSeal(invoice))));
  const signature = ed25519.sign(encoder.encode(DOMAIN + summary), key.secretKey);
  return `${summary}.${toBase64Url(signature)}.${toBase64Url(key.publicKey)}`;
}

function readSummary(value: unknown): SealSummary | null {
  const s = value as Partial<SealSummary> | null;
  if (!s || typeof s !== "object") return null;
  const text = (x: unknown) => typeof x === "string";
  const int = (x: unknown) => Number.isSafeInteger(x);
  const ok =
    s.v === 1 &&
    (s.kind === "invoice" || s.kind === "receipt" || s.kind === "quote") &&
    text(s.no) &&
    text(s.from) &&
    text(s.to) &&
    text(s.on) &&
    (s.due === null || text(s.due)) &&
    text(s.cur) &&
    int(s.total) &&
    int(s.tax) &&
    int(s.items) &&
    text(s.hash);
  return ok ? (s as SealSummary) : null;
}

/** Checks a seal: well formed, and signed by the key it carries. */
export function verifySeal(seal: string): SealCheck {
  const parts = seal.trim().split(".");
  if (parts.length !== 3) return { valid: false, reason: "malformed" };
  const [encodedSummary = "", encodedSignature = "", encodedKey = ""] = parts;
  let summary: SealSummary | null;
  let signature: Uint8Array;
  let publicKey: Uint8Array;
  try {
    const raw = JSON.parse(decoder.decode(fromBase64Url(encodedSummary)));
    if (raw?.v !== 1) return { valid: false, reason: "unsupported" };
    summary = readSummary(raw);
    signature = fromBase64Url(encodedSignature);
    publicKey = fromBase64Url(encodedKey);
  } catch {
    return { valid: false, reason: "malformed" };
  }
  if (!summary || signature.length !== 64 || publicKey.length !== 32) {
    return { valid: false, reason: "malformed" };
  }
  const issuerId = issuerIdFor(publicKey);
  let verified = false;
  try {
    verified = ed25519.verify(signature, encoder.encode(DOMAIN + encodedSummary), publicKey, {
      zip215: false,
    });
  } catch {
    verified = false;
  }
  return verified
    ? { valid: true, summary, issuerId, publicKey: encodedKey }
    : { valid: false, reason: "signature", summary, issuerId };
}

/** Whether a full document is the one a seal was made for. */
export function sealMatchesDocument(summary: SealSummary, invoice: InvoiceDocument): boolean {
  return summary.hash === contentHash(invoice);
}

/** Pulls a seal out of a scanned QR payload or a pasted verification link. */
export function extractSeal(scanned: string): string | null {
  const text = scanned.trim();
  const fragment = text.includes("#") ? text.slice(text.indexOf("#") + 1) : text;
  const seal = decodeURIComponent(fragment).replace(/^seal=/, "");
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(seal) ? seal : null;
}
