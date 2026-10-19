import { minorToInput, parseMoney } from "@notables/core";
import type { FinanceTransaction } from "../model/transaction";

const currencyPattern = "UGX|USD|EUR|GBP|KES|TZS|RWF|NGN|ZAR|GHS";
const numberPattern = "[\\d,]+(?:\\.\\d{1,2})?";
const moneyPattern = `(?:(?<currency>${currencyPattern})\\s*(?<amount>${numberPattern})|(?<afterAmount>${numberPattern})\\s*(?<afterCurrency>${currencyPattern}))`;

export interface MobileMoneySuggestion {
  currency: string;
  amount: string;
  direction: FinanceTransaction["direction"];
  category: NonNullable<FinanceTransaction["category"]>;
  description: string;
  reference: string;
  date?: string;
  fee: number;
  sourceText: string;
}

function parseMessage(text: string): MobileMoneySuggestion | null {
  // An approval invitation is not evidence that money moved.
  if (/\b(?:my approvals|allow payment|payment request|pending approval)\b/i.test(text))
    return null;
  const match = text.match(
    new RegExp(
      `(?:\\b(?:received|sent|paid|withdrawn|deposited|transferred|deducted|used)\\s+(?:an?\\s+amount\\s+of\\s+)?|Y'ello\\.\\s*)${moneyPattern}`,
      "i",
    ),
  );
  const groups = match?.groups;
  const currency = (groups?.currency ?? groups?.afterCurrency)?.toUpperCase();
  const raw = groups?.amount ?? groups?.afterAmount;
  if (!match || !currency || !raw) return null;
  const amount = parseMoney(raw, currency);
  if (amount === null || amount <= 0 || !Number.isSafeInteger(amount)) return null;
  const category = /\bused to repay\b/i.test(text)
    ? "repayment"
    : /\b(?:MOMOADVANCE|from\s+MoKash)\b/i.test(text)
      ? "borrowing"
      : /\btransferred\b/i.test(text)
        ? "transfer"
        : "payment";
  const direction =
    category === "borrowing" || /\b(?:received|deposited)\b/i.test(match[0]) ? "income" : "expense";
  const counterparty =
    text.match(/Y'ello\.\s*(.+?)\s+has deducted/i)?.[1] ??
    text.match(/\b(?:from|to)\s+(.+?)(?=\s+(?:on|at|from your)\b|,?\s*\(?\+?\d{9,}|\.\s|$)/i)?.[1];
  const description =
    category === "borrowing"
      ? /MOMOADVANCE/i.test(text)
        ? "MOMOADVANCE"
        : "MoKash"
      : category === "repayment"
        ? "OVERDRAFT"
        : counterparty?.replace(/[\s.,]+$/, "") || text.slice(0, 200);
  const feeMatch = text.match(
    new RegExp(
      `\\b(?:access\\s+)?fee\\s*:\\s*(?:${currency}\\s*)?(${numberPattern})|\\b(?:access\\s+)?fee\\s+(?:of\\s+)?(?:${currency}\\s*)?(${numberPattern})`,
      "i",
    ),
  );
  const fee = parseMoney(feeMatch?.[1] ?? feeMatch?.[2] ?? "0", currency) ?? 0;
  return {
    currency,
    amount: minorToInput(amount, currency),
    direction,
    category,
    description,
    fee: Number.isSafeInteger(fee) && fee >= 0 ? fee : 0,
    reference:
      text.match(
        /\b(?:financial\s+transaction\s*id|transaction\s*(?:id|ref)?|txn\s*id|reference|ref|id)\s*[:#.]?\s*([A-Z0-9-]{6,40})\b/i,
      )?.[1] ?? "",
    date: text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1],
    sourceText: text.trim(),
  };
}

/** Split conversation pastes at notification starts, ignoring timestamps and link previews. */
export function parseMobileMoneyMessages(text: string): MobileMoneySuggestion[] {
  const chunks = text.split(
    /(?=\bYou (?:have |received |sent |paid |withdrawn |deposited |transferred )|Y'ello\.)/i,
  );
  const results = chunks
    .map((chunk) =>
      parseMessage(
        chunk.split(
          /\n(?:\s*Select country|\s*momo\.mtn|\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),)/i,
        )[0] ?? chunk,
      ),
    )
    .filter((item): item is MobileMoneySuggestion => item !== null);
  // Only infer a missing reference when an exact timestamp identifies one payment.
  for (const item of results) {
    if (item.reference || item.category !== "borrowing") continue;
    const timestamp = item.sourceText.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)?.[0];
    if (!timestamp) continue;
    const payments = results.filter(
      (other) =>
        other.category === "payment" && other.reference && other.sourceText.includes(timestamp),
    );
    if (payments.length === 1) item.reference = payments[0]?.reference ?? "";
  }
  for (const item of results) {
    if (item.date || !item.reference) continue;
    const dates = new Set(
      results
        .filter((other) => other.reference === item.reference && other.date)
        .map((other) => other.date),
    );
    if (dates.size === 1) item.date = [...dates][0];
  }
  return results;
}

export function sameImportedTransaction(
  a: Pick<
    FinanceTransaction,
    "source" | "sourceText" | "reference" | "currency" | "category" | "direction"
  >,
  b: typeof a,
): boolean {
  if (a.source !== "sms" || b.source !== "sms") return false;
  if (a.sourceText.trim() && a.sourceText.trim() === b.sourceText.trim()) return true;
  const category = (item: typeof a) =>
    item.category ?? parseMobileMoneyMessages(item.sourceText)[0]?.category ?? "payment";
  return Boolean(
    a.reference &&
      a.reference === b.reference &&
      a.currency === b.currency &&
      a.direction === b.direction &&
      category(a) === category(b),
  );
}
