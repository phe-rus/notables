import type { InvoiceDocument, LineItem } from "./invoice";

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

/** A line's amount in minor units, rounded half away from zero. */
export function lineAmount(item: Pick<LineItem, "quantity" | "unitPrice">): number {
  return Math.round(item.quantity * item.unitPrice);
}

export function computeTotals(
  invoice: Pick<InvoiceDocument, "items" | "taxRate" | "discount">,
): InvoiceTotals {
  const subtotal = invoice.items.reduce((sum, item) => sum + lineAmount(item), 0);
  const discount = Math.min(Math.max(0, Math.round(invoice.discount)), subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * Math.max(0, invoice.taxRate)) / 100);
  return { subtotal, discount, taxable, tax, total: taxable + tax };
}
