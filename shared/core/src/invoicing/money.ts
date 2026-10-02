/** Digits after the decimal point for a currency (2 for USD, 0 for UGX). */
export function minorDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Formats minor units as money, e.g. 123456 USD → "$1,234.56". */
export function formatMoney(minor: number, currency: string, locale?: string): string {
  const digits = minorDigits(currency);
  const value = minor / 10 ** digits;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(digits)}`;
  }
}

/**
 * Reads a typed amount ("1,234.5", "1234") into minor units. Returns null
 * for anything that isn't a plain non-negative number.
 */
export function parseMoney(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s,_']/g, "");
  if (!/^\d*(\.\d*)?$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const digits = minorDigits(currency);
  const [whole = "0", fraction = ""] = cleaned.split(".");
  const padded = `${fraction}${"0".repeat(digits)}`.slice(0, digits);
  // Round half up on the first dropped digit.
  const roundUp = Number(fraction[digits] ?? "0") >= 5 ? 1 : 0;
  return Number(whole || "0") * 10 ** digits + Number(padded || "0") + roundUp;
}

/** Minor units as a plain editable number, e.g. 123450 USD → "1234.50". */
export function minorToInput(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  return (minor / 10 ** digits).toFixed(digits);
}
