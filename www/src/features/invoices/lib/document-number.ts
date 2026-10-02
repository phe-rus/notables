import type { InvoiceKind } from "@notables/core";

const prefixes: Record<InvoiceKind, string> = { invoice: "INV", receipt: "RCT", quote: "QUO" };

/**
 * The next number for a kind of document: one more than the highest used
 * so far with the same prefix, e.g. INV-0007 after INV-0006.
 */
export function nextDocumentNumber(kind: InvoiceKind, existing: string[]): string {
  const prefix = prefixes[kind];
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = existing.reduce((max, number) => {
    const match = pattern.exec(number.trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(4, "0")}`;
}

/** Today in the device's time zone, as YYYY-MM-DD. */
export function today(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
