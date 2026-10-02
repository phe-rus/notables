/**
 * Invoices, receipts and quotes. Amounts are integers in the currency's
 * minor unit (cents, or whole shillings for UGX) so totals never drift.
 */
export type InvoiceKind = "invoice" | "receipt" | "quote";

export interface InvoiceParty {
  name: string;
  email: string;
  phone: string;
  address: string;
  /** VAT, TIN or similar. */
  taxId: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  /** Price of one unit, in minor units. */
  unitPrice: number;
}

export type InvoiceLayout = "classic" | "modern" | "minimal";
export type InvoiceFont = "serif" | "sans";

/** How the document looks; never part of what is signed. */
export interface InvoiceStyle {
  /** Hex color for headings, rules and the total. */
  accent: string;
  layout: InvoiceLayout;
  font: InvoiceFont;
  /** `media:<id>` of the issuer's logo, if any. */
  logo: string | null;
}

export interface InvoiceDocument {
  id: string;
  kind: InvoiceKind;
  /** The issuer's reference, e.g. "INV-0042". */
  number: string;
  /** ISO 4217 code, e.g. "UGX", "USD". */
  currency: string;
  /** Calendar dates as YYYY-MM-DD. */
  issuedOn: string;
  dueOn: string | null;
  issuer: InvoiceParty;
  client: InvoiceParty;
  items: LineItem[];
  /** Percent, e.g. 18 for 18%. */
  taxRate: number;
  /** Minor units taken off before tax. */
  discount: number;
  notes: string;
  /** Bank, mobile money or other instructions. */
  paymentDetails: string;
  style: InvoiceStyle;
  createdAt: number;
  updatedAt: number;
}

export const invoiceKindLabels: Record<InvoiceKind, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  quote: "Quote",
};

export const emptyParty = (): InvoiceParty => ({
  name: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
});
