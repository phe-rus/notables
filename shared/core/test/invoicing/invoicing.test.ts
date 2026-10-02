import { describe, expect, it } from "bun:test";
import {
  canonicalJson,
  computeTotals,
  createSeal,
  createSigningKey,
  emptyParty,
  extractSeal,
  formatMoney,
  type InvoiceDocument,
  issuerIdFor,
  parseMoney,
  sealMatchesDocument,
  toBase64Url,
  verifySeal,
} from "../../src/index";

const invoice = (overrides: Partial<InvoiceDocument> = {}): InvoiceDocument => ({
  id: "inv-1",
  kind: "invoice",
  number: "INV-0042",
  currency: "USD",
  issuedOn: "2026-10-02",
  dueOn: "2026-10-16",
  issuer: { ...emptyParty(), name: "Amara Studio" },
  client: { ...emptyParty(), name: "Lakeside Café" },
  items: [
    { id: "a", description: "Logo design", quantity: 1, unitPrice: 45000 },
    { id: "b", description: "Menu layout", quantity: 3, unitPrice: 12550 },
  ],
  taxRate: 18,
  discount: 5000,
  notes: "Thank you!",
  paymentDetails: "Mobile money 0772 000 000",
  style: { accent: "#E39A2E", layout: "modern", font: "sans", logo: null },
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
});

describe("money", () => {
  it("formats and parses minor units per currency", () => {
    expect(formatMoney(123456, "USD", "en-US")).toBe("$1,234.56");
    expect(formatMoney(150000, "UGX", "en-US").replace(/\s/g, " ")).toBe("UGX 150,000");
    expect(parseMoney("1,234.56", "USD")).toBe(123456);
    expect(parseMoney("12.345", "USD")).toBe(1235);
    expect(parseMoney("150000", "UGX")).toBe(150000);
    expect(parseMoney("12a", "USD")).toBeNull();
    expect(parseMoney("-4", "USD")).toBeNull();
  });
});

describe("totals", () => {
  it("applies the discount before tax and rounds per line", () => {
    expect(computeTotals(invoice())).toEqual({
      subtotal: 82650,
      discount: 5000,
      taxable: 77650,
      tax: 13977,
      total: 91627,
    });
  });

  it("never discounts below zero", () => {
    expect(computeTotals(invoice({ discount: 999999 })).total).toBe(0);
  });
});

describe("seal", () => {
  const key = createSigningKey();

  it("verifies a genuine seal and names its issuer", () => {
    const check = verifySeal(createSeal(invoice(), key));
    expect(check.valid).toBe(true);
    if (!check.valid) return;
    expect(check.issuerId).toBe(issuerIdFor(key.publicKey));
    expect(check.issuerId).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(check.summary).toMatchObject({ no: "INV-0042", from: "Amara Studio", total: 91627 });
  });

  it("rejects a seal whose summary was edited", () => {
    const [summary, signature, publicKey] = createSeal(invoice(), key).split(".");
    const decoded = JSON.parse(atob((summary ?? "").replace(/-/g, "+").replace(/_/g, "/")));
    decoded.total = 1;
    const forged = toBase64Url(new TextEncoder().encode(canonicalJson(decoded)));
    const check = verifySeal(`${forged}.${signature}.${publicKey}`);
    expect(check).toMatchObject({ valid: false, reason: "signature" });
  });

  it("gives a forger's own key a different issuer ID", () => {
    const forger = createSigningKey();
    const check = verifySeal(createSeal(invoice(), forger));
    expect(check.valid).toBe(true);
    expect(check.valid && check.issuerId).not.toBe(issuerIdFor(key.publicKey));
  });

  it("detects a changed document through the content hash", () => {
    const check = verifySeal(createSeal(invoice(), key));
    if (!check.valid) throw new Error("expected a valid seal");
    expect(
      sealMatchesDocument(
        check.summary,
        invoice({ style: { accent: "#000", layout: "minimal", font: "serif", logo: null } }),
      ),
    ).toBe(true);
    const tampered = invoice();
    tampered.items[0] = { id: "a", description: "Logo design", quantity: 1, unitPrice: 95000 };
    expect(sealMatchesDocument(check.summary, tampered)).toBe(false);
  });

  it("rejects malformed input and reads seals out of links", () => {
    expect(verifySeal("not-a-seal").valid).toBe(false);
    expect(verifySeal("a.b.c")).toMatchObject({ valid: false, reason: "malformed" });
    const seal = createSeal(invoice(), key);
    expect(extractSeal(`https://notables.example/verify#${seal}`)).toBe(seal);
    expect(extractSeal(seal)).toBe(seal);
    expect(extractSeal("https://example.com/other")).toBeNull();
  });
});
