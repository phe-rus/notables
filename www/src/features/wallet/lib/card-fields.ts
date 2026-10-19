import type { AccentId } from "@phe-rus/hino/tokens";
import type { CardKind } from "../model/wallet-model";
import { readMrz } from "./mrz";

export interface CardSuggestions {
  kind: CardKind;
  palette?: AccentId;
  cvv?: string;
  numberUncertain?: boolean;
  meter: string;
  account: string;
  displayName: string;
  holder: string;
  number: string;
  expiry: string;
  issuer: string;
  puk: string;
}

/** Conservative suggestions only. Confirmation in review is always required. */
export function suggestCardFields(text: string): CardSuggestions {
  // A passport or ID card's machine-readable zone beats anything else on it.
  const mrz = readMrz(text);
  if (mrz) {
    const holder = `${mrz.givenNames} ${mrz.surname}`
      .trim()
      .toLowerCase()
      .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
    return {
      kind: mrz.kind,
      meter: "",
      account: "",
      displayName: holder || mrz.country,
      holder,
      number: mrz.number,
      expiry: mrz.expiry,
      issuer: mrz.country,
      puk: "",
    };
  }
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labeled = (label: string, numeric: boolean | "date" = true) => {
    const pattern = new RegExp(
      `^(?:${label})\\b\\s*(?:number|no\\.?|n[°º])?\\s*[:#-]?\\s*(.*)$`,
      "i",
    );
    for (const [index, line] of lines.entries()) {
      const match = line.match(pattern);
      if (!match) continue;
      const candidates = [match[1]?.trim() ?? "", lines[index + 1] ?? "", lines[index + 2] ?? ""];
      for (const [candidateIndex, raw] of candidates.entries()) {
        const value = raw.replace(
          /^[/|]\s*(?:nom|pr[eé]noms?|name|surname|given names?)\b\s*[:.-]?\s*/i,
          "",
        );
        const header =
          /^(?:surname|family name|nom|given names?|first names?|pr[eé]noms?|nationality|date of|birth|expiry|expiration|sex|gender|place of|personal|passport|document|type)\b/i.test(
            value,
          );
        if (candidateIndex > 0 && header && !pattern.test(raw)) break;
        const valid =
          numeric === "date"
            ? /^(?:\d{1,4}[/.-]\d{1,2}(?:[/.-]\d{2,4})?|\d{1,2}\s+[\p{L}]{3,12}\s+\d{2,4})$/u.test(
                value,
              )
            : numeric
              ? !/^\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(value) &&
                (/^(?=.*\d)[\p{L}\d][\p{L}\d/-]{2,}$/u.test(value) ||
                  /^\d[\d -]{2,}$/.test(value) ||
                  /^[A-Z]{1,3}\s+\d[\d -]{3,}[A-Z]{0,3}$/i.test(value))
              : !header && /^[\p{L}][\p{L} .'-]+$/u.test(value);
        if (valid) return value.slice(0, 4096);
      }
    }
    return "";
  };
  const passport = /\b(?:passport|passeport|pasaporte|passaporte)\b/i.test(text);
  const identity =
    /\b(?:national identity|national identification|national id|nira|identity card|identification card|carte d.identit[eé]|kitambulisho|nin)\b/i.test(
      text,
    );
  const compact = text.normalize("NFKD").replace(/\p{M}/gu, "").replace(/\s/g, "");
  const utilityBrand = ["Umeme", "UEDCL"].find((name) =>
    compact.toLowerCase().includes(name.toLowerCase()),
  );
  const electricity =
    !!utilityBrand ||
    /\b(?:umeme|uedcl|yaka|electricity|electric|meter|compteur|stima)\b/i.test(text);
  const television = /\b(?:dstv|gotv|startimes|multichoice|smartcard|decoder|pay tv)\b/i.test(text);
  const membership =
    /\b(?:membership|member|loyalty|library|student card|carte de membre|mwanachama)\b/i.test(text);
  const iccid = text.replace(/[ -]/g, "").match(/(?<!\d)89\d{17,18}(?!\d)/)?.[0] ?? "";
  const sim = !!iccid || /\b(?:sim card|iccid|puk\s*1?)\b/i.test(text);
  const bankBrand =
    /\b(?:visa|mastercard|maestro|american express|amex|bank|bancaire|credit card|debit card)\b/i.test(
      text,
    );
  const groupedNumber = bankBrand
    ? (lines.find(
        (line) =>
          /^\d{2,6}(?:[ -]+\d{2,6}){2,5}$/.test(line) &&
          line.replace(/\D/g, "").length >= 12 &&
          line.replace(/\D/g, "").length <= 19,
      ) ?? "")
    : "";
  // Vision may put each printed number group in a separate text observation.
  const numberText = bankBrand ? text.replace(/(?<=\d)[\t\r\n]+(?=\d)/g, " ") : text;
  const printedNumber =
    numberText
      .match(
        /(?<!\d)(?:\d{4}[ -]){3}\d{4}(?!\d)|(?<!\d)\d{4}[ -]\d{6}[ -]\d{5}(?!\d)|(?<!\d)\d{12,19}(?!\d)/,
      )?.[0]
      .trim() || groupedNumber;
  const labeledExpiry = labeled(
    "expiry|expires|expiration|date of expiry|valid until|valid thru|valid through|date d.expiration",
    "date",
  );
  const expiry =
    labeledExpiry || text.match(/\b(?:0[1-9]|1[0-2])\s*\/\s*\d{2}(?:\d{2})?\b/)?.[0] || "";
  const bank =
    /\b(?:visa|mastercard|maestro|american express|amex)\b/i.test(text) ||
    (!!printedNumber && (bankBrand || !!expiry));
  const digits = printedNumber.replace(/\D/g, "");
  const numberUncertain =
    bank &&
    !!digits &&
    ((/\bvisa\b/i.test(text) && ![13, 16, 19].includes(digits.length)) ||
      (/\b(?:mastercard|maestro)\b/i.test(text) && digits.length < 16) ||
      !validCardNumber(digits));
  const kind: CardKind = passport
    ? "passport"
    : identity
      ? "national-id"
      : electricity
        ? "electricity"
        : television
          ? "television"
          : sim
            ? "sim"
            : membership
              ? "membership"
              : bank
                ? "bank"
                : "other";
  const number =
    (kind === "bank" && printedNumber) ||
    labeled("passport|document|nin|id|card|member|membership|num[eé]ro|namba") ||
    printedNumber;
  const labeledHolder = labeled("cardholder|holder|full name|name|titulaire|titular|jina", false);
  const surname = labeled("surname|family name|nom", false);
  const given = labeled("given names?|first names?|pr[eé]noms?", false);
  const holder =
    labeledHolder ||
    [given, surname].filter(Boolean).join(" ") ||
    (bank
      ? (lines.findLast(
          (line) =>
            /^[\p{L}][\p{L} .'-]+\s[\p{L} .'-]+$/u.test(line) &&
            !/\b(?:bank|visa|mastercard|credit|debit|valid|thru|expir\w*|date|member|card|american express|signature)\b/i.test(
              line,
            ),
        ) ?? "")
      : "");
  const issuer =
    (utilityBrand ||
      [
        "Umeme",
        "UEDCL",
        "DStv",
        "GOtv",
        "StarTimes",
        "MultiChoice",
        "Stanbic",
        "Centenary",
        "Absa",
        "DFCU",
        "Standard Chartered",
        "Equity",
        "KCB",
        "MTN",
        "Airtel",
      ].find((name) => new RegExp(`\\b${name}\\b`, "i").test(text))) ??
    "";
  const standalone = lines.filter((line) => /^\d[\d -]{7,18}$/.test(line));
  return {
    kind,
    numberUncertain: kind === "bank" && numberUncertain,
    meter: electricity
      ? labeled("meter|compteur|namba ya mita") ||
        (standalone.length === 1 ? (standalone[0] ?? "") : "")
      : "",
    account: iccid || labeled("account|customer|subscriber|smart\\s*card|decoder|compte"),
    displayName: (
      issuer ||
      lines.find((line) => /\p{L}{3}/u.test(line) && !/^[A-Z]<|^\d/.test(line)) ||
      ""
    ).slice(0, 200),
    holder,
    number: electricity || sim ? "" : number,
    expiry: electricity || television || sim ? "" : passport || identity ? labeledExpiry : expiry,
    issuer,
    puk: sim ? (text.match(/\bPUK\s*1?\s*[:.]?\s*(\d{8})\b/i)?.[1] ?? "") : "",
    cvv: text.match(/\b(?:CVV2?|CVC2?|security code)\s*[:.]?\s*(\d{3,4})\b/i)?.[1] ?? "",
  };
}

/** A failed checksum marks a suggestion for review; it never repairs or drops digits. */
function validCardNumber(digits: string) {
  let total = 0;
  for (let i = digits.length - 1, position = 0; i >= 0; i--, position++) {
    let digit = Number(digits[i]);
    if (position % 2) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
  }
  return total % 10 === 0;
}
