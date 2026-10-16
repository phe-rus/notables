import { emptyParty, type InvoiceParty, type InvoiceStyle } from "@notables/core";
import { syncedSetting } from "../../../platform/settings/synced-settings";

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

const stored = syncedSetting("notables:issuer-defaults");

export const fallbackDefaults: IssuerDefaults = {
  issuer: emptyParty(),
  currency: "USD",
  taxRate: 0,
  paymentDetails: "",
  style: { accent: "#E39A2E", layout: "modern", font: "sans", logo: null },
};

export function getIssuerDefaults(): IssuerDefaults {
  const saved = stored.get() as Partial<IssuerDefaults> | undefined;
  return saved
    ? {
        ...fallbackDefaults,
        ...saved,
        issuer: { ...emptyParty(), ...saved.issuer },
        style: { ...fallbackDefaults.style, ...saved.style },
      }
    : fallbackDefaults;
}

export function rememberIssuerDefaults(defaults: IssuerDefaults): void {
  stored.set(defaults);
}
