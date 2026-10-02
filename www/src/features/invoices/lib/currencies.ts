import { locale } from "../../../i18n/i18n";

/** Currencies offered first; any other ISO code a document already uses is kept. */
export const currencies = [
  "USD",
  "EUR",
  "GBP",
  "UGX",
  "KES",
  "TZS",
  "RWF",
  "NGN",
  "ZAR",
  "GHS",
  "CAD",
  "AUD",
  "INR",
  "JPY",
];

/**
 * Pop-up choices: the document's own currency and the common ones first,
 * then every other currency the system knows, each with its name in the
 * reader's language.
 */
export function currencyOptions(
  current: string,
): { value: string; label: string; detail?: string }[] {
  const all =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : [];
  const codes = [...new Set([current, ...currencies, ...all])];
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames(locale(), { type: "currency" });
  } catch {
    names = undefined;
  }
  return codes.map((code) => {
    const name = names?.of(code);
    return { value: code, label: code, detail: name && name !== code ? name : undefined };
  });
}
