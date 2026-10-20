import { expect, test } from "bun:test";
import { emptyParty, type InvoiceDocument } from "@notables/core";
import * as Y from "yjs";
import { financeLedger, ledgerCsv, suggestTransaction } from "@/features/finances/lib/ledger";
import { FinanceStore } from "@/features/finances/store/finance-store";

const draft = {
  direction: "expense" as const,
  date: "2026-10-17",
  description: "Groceries",
  currency: "UGX",
  amount: 12500,
  reference: "TXN123456",
  source: "sms" as const,
  sourceText: "You have paid UGX 12,500. Balance UGX 980,000.",
  attachments: [],
};
test("mobile money extraction takes the payment, never the balance", () => {
  expect(suggestTransaction(draft.sourceText)).toMatchObject({
    amount: "12500",
    currency: "UGX",
    direction: "expense",
  });
  expect(suggestTransaction("You received USD 12.50 from Jane. Balance USD 500.00.")).toMatchObject(
    { amount: "12.50", currency: "USD", direction: "income" },
  );
  expect(suggestTransaction("Balance UGX 900,000. Call 0772123456.").amount).toBe("");
  expect(suggestTransaction("Shop\nSubtotal USD 10.00\nTax USD 1.50\nTOTAL USD 11.50").amount).toBe(
    "11.50",
  );
});
test("transactions sync and duplicate imported references are refused", () => {
  const first = new Y.Doc();
  const store = new FinanceStore(first);
  const saved = store.save(draft);
  expect(() => store.save(draft)).toThrow("duplicate-transaction");
  expect(() => store.save({ ...draft, amount: Number.NaN })).toThrow("invalid-transaction");
  store.save({ ...draft, description: "Food" }, saved.id);
  const peer = new Y.Doc();
  const second = new FinanceStore(peer);
  Y.applyUpdate(peer, Y.encodeStateAsUpdate(first));
  expect(second.getSnapshot()).toHaveLength(1);
  expect(second.getSnapshot()[0]?.description).toBe("Food");
});
test("the ledger preserves document type, currency and exact minor units", () => {
  const invoice: InvoiceDocument = {
    id: "quote",
    kind: "quote",
    number: "Q-1",
    currency: "USD",
    issuedOn: "2026-10-16",
    dueOn: null,
    issuer: emptyParty(),
    client: emptyParty(),
    items: [{ id: "line", description: "Work", quantity: 1, unitPrice: 1234 }],
    taxRate: 0,
    discount: 0,
    notes: "",
    paymentDetails: "",
    style: { accent: "", font: "sans", layout: "classic", logo: null },
    createdAt: 1,
    updatedAt: 1,
  };
  const rows = financeLedger([], [invoice]);
  expect(rows[0]).toMatchObject({ type: "quote", currency: "USD", amount: 1234 });
  const row = rows[0];
  if (!row) throw new Error("missing ledger row");
  const csv = ledgerCsv(
    [{ ...row, description: '=HYPERLINK("bad")' }],
    ["Date", "Type", "Description", "Reference", "Currency", "Amount"],
  );
  expect(csv).toContain('"12.34"');
  expect(csv).toContain("'=HYPERLINK");
});
