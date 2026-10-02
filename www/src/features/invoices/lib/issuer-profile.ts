import { emptyParty, type InvoiceParty, type InvoiceStyle } from "@notables/core";

/**
 * What new documents start with: the issuer's own details, last currency,
 * tax rate, payment details and look. Remembered on this device.
 */
export interface IssuerDefaults {
  issuer: InvoiceParty;
  currency: string;
  taxRate: number;
  paymentDetails: string;
  style: InvoiceStyle;
}

const STORAGE_KEY = "notables:issuer-defaults";

export const fallbackDefaults: IssuerDefaults = {
  issuer: emptyParty(),
  currency: "USD",
  taxRate: 0,
  paymentDetails: "",
  style: { accent: "#E39A2E", layout: "modern", font: "sans", logo: null },
};

export function getIssuerDefaults(): IssuerDefaults {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return stored
      ? {
          ...fallbackDefaults,
          ...stored,
          issuer: { ...emptyParty(), ...stored.issuer },
          style: { ...fallbackDefaults.style, ...stored.style },
        }
      : fallbackDefaults;
  } catch {
    return fallbackDefaults;
  }
}

export function rememberIssuerDefaults(defaults: IssuerDefaults): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Not remembered; new documents simply start blank.
  }
}
