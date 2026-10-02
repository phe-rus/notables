import { describe, expect, it } from "bun:test";
import {
  createSeal,
  createSigningKey,
  emptyParty,
  type InvoiceDocument,
  issuerIdFor,
  verifySeal,
} from "@notables/core";
import { buildInvoicePdf, sealFromPdf } from "../../src/features/invoices/export/invoice-pdf";

const invoice: InvoiceDocument = {
  id: "inv",
  kind: "invoice",
  number: "INV-0007",
  currency: "UGX",
  issuedOn: "2026-10-02",
  dueOn: "2026-10-16",
  issuer: { ...emptyParty(), name: "Amara Studio", address: "Plot 12, Kampala Road\nKampala" },
  client: { ...emptyParty(), name: "Lakeside Café" },
  items: Array.from({ length: 30 }, (_, i) => ({
    id: String(i),
    description: `Item ${i + 1} — design and layout, with a longer description that wraps onto a second line`,
    quantity: 1 + (i % 3),
    unitPrice: 150_000,
  })),
  taxRate: 18,
  discount: 0,
  notes: "Thank you − see you soon",
  paymentDetails: "MTN Mobile Money · 0772 123 456",
  style: { accent: "#2C6193", layout: "classic", font: "serif", logo: null },
  createdAt: 1,
  updatedAt: 2,
};

describe("buildInvoicePdf", () => {
  const key = createSigningKey();
  const seal = createSeal(invoice, key);
  const link = `https://notables.example/verify#${seal}`;

  it("writes a PDF that carries a verifiable seal", async () => {
    const bytes = await buildInvoicePdf({
      invoice,
      verifyLink: link,
      issuerId: issuerIdFor(key.publicKey),
      seal,
    });
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    const found = sealFromPdf(bytes);
    expect(found).toBe(seal);
    const check = verifySeal(found ?? "");
    expect(check.valid && check.summary.no).toBe("INV-0007");
  });

  it("spills long invoices onto more pages", async () => {
    const bytes = await buildInvoicePdf({ invoice, verifyLink: link, issuerId: "X", seal });
    const pages = new TextDecoder("latin1").decode(bytes).match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(pages).toBeGreaterThan(1);
  });

  it("finds nothing in other PDFs", () => {
    expect(sealFromPdf(new TextEncoder().encode("%PDF-1.7 nothing here"))).toBeNull();
  });
});
