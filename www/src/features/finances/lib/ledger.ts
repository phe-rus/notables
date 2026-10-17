import { computeTotals, type InvoiceDocument, minorToInput, parseMoney } from "@notables/core";
import type { FinanceTransaction } from "../model/transaction";

export interface LedgerRow {
  id: string;
  date: string;
  description: string;
  currency: string;
  amount: number;
  type: "income" | "expense" | "invoice" | "receipt" | "quote";
  reference: string;
}

/** Documents remain documents: an invoice or quote is never assumed to be paid. */
export function financeLedger(
  transactions: readonly FinanceTransaction[],
  documents: readonly InvoiceDocument[],
): LedgerRow[] {
  return [
    ...transactions.map((item) => ({ ...item, type: item.direction })),
    ...documents.map((item) => ({
      id: item.id,
      date: item.issuedOn,
      description: item.client.name || item.issuer.name || item.number,
      currency: item.currency,
      amount: computeTotals(item).total,
      type: item.kind,
      reference: item.number,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Only suggest explicit currency amounts, never an account balance or phone number. */
export function suggestTransaction(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const totalLine = [...lines]
    .reverse()
    .find((line) => /^(?:grand\s+total|total(?:\s+paid)?|amount(?:\s+paid)?)\s*[:\s]/i.test(line));
  const message = text.match(
    /\b(?:received|sent|paid|withdrawn|deposited|transferred)\s+(?:an?\s+amount\s+of\s+)?(UGX|USD|EUR|GBP|KES|TZS|RWF|NGN|ZAR|GHS)\s*([\d,]+(?:\.\d{1,2})?)/i,
  );
  const currencies = [
    ...new Set(
      [...text.matchAll(/\b(UGX|USD|EUR|GBP|KES|TZS|RWF|NGN|ZAR|GHS)\b/gi)].map((match) =>
        match[1]?.toUpperCase(),
      ),
    ),
  ];
  const currency =
    message?.[1]?.toUpperCase() ??
    totalLine?.match(/\b(UGX|USD|EUR|GBP|KES|TZS|RWF|NGN|ZAR|GHS)\b/i)?.[1]?.toUpperCase() ??
    (currencies.length === 1 ? currencies[0] : "") ??
    "";
  const totalAmount = totalLine?.match(
    /(?:\b(?:UGX|USD|EUR|GBP|KES|TZS|RWF|NGN|ZAR|GHS)\s*)?([\d,]+(?:\.\d{1,2})?)\s*$/i,
  )?.[1];
  const raw = message?.[2] ?? totalAmount;
  const amount = raw && currency ? parseMoney(raw, currency) : null;
  return {
    currency,
    amount: amount !== null && Number.isSafeInteger(amount) ? minorToInput(amount, currency) : "",
    direction: /\b(?:received|deposited)\b/i.test(text)
      ? ("income" as const)
      : ("expense" as const),
    description: lines[0]?.slice(0, 200) ?? "",
    reference:
      text.match(
        /\b(?:transaction\s*(?:id|ref)?|txn\s*(?:id)?|reference|ref)\s*[:#.]?\s*([A-Z0-9-]{6,40})\b/i,
      )?.[1] ?? "",
  };
}

/** Prefix formula-looking text so opening the exported CSV cannot execute it. */
export function ledgerCsv(rows: readonly LedgerRow[], headings: readonly string[]): string {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@-]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return [
    headings,
    ...rows.map((row) => [
      row.date,
      row.type,
      row.description,
      row.reference,
      row.currency,
      minorToInput(row.amount, row.currency),
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}
