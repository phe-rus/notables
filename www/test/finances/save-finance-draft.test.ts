import { expect, test } from "bun:test";
import * as Y from "yjs";
import { saveFinanceDraft } from "@/features/finances/lib/save-finance-draft";
import type { FinanceDraft } from "@/features/finances/model/types";
import { FinanceStore } from "@/features/finances/store/finance-store";

const draft: FinanceDraft = {
  direction: "expense",
  date: "2026-10-21",
  description: "Sample groceries",
  currency: "USD",
  amount: "12.50",
  fee: 25,
  reference: "DEMO123456",
  source: "manual",
  sourceText: "",
  attachments: ["media:existing"],
};
const receipt = new File(["synthetic receipt"], "receipt.png", { type: "image/png" });

test("invalid financial details do not write receipt files or change the ledger", async () => {
  const doc = new Y.Doc();
  const store = new FinanceStore(doc);
  let writes = 0;
  try {
    for (const patch of [
      { fee: Number.NaN },
      { fee: -1 },
      { amount: "-12.50" },
      { date: "2026-02-30" },
      { date: "not-a-date" },
      { currency: "usd" },
      { source: "sms" as const, sourceText: "" },
    ]) {
      await expect(
        saveFinanceDraft({ ...draft, ...patch }, [receipt], {
          store,
          writeMedia: async () => {
            writes++;
            return "new";
          },
        }),
      ).rejects.toThrow("invalid-transaction");
      expect(writes).toBe(0);
      expect(store.getSnapshot()).toHaveLength(0);
    }
  } finally {
    doc.destroy();
  }
});

test("saving keeps exact minor units and existing attachments", async () => {
  const doc = new Y.Doc();
  const store = new FinanceStore(doc);
  try {
    const saved = await saveFinanceDraft(draft, [receipt], {
      store,
      writeMedia: async (file) => {
        expect(file).toBe(receipt);
        return "new";
      },
    });
    expect(saved).toMatchObject({
      amount: 1250,
      fee: 25,
      attachments: ["media:existing", "media:new"],
    });
    expect(draft.attachments).toEqual(["media:existing"]);
  } finally {
    doc.destroy();
  }
});

test("duplicate imports are rejected before attachment writes but edits remain allowed", async () => {
  const doc = new Y.Doc();
  const store = new FinanceStore(doc);
  const imported = {
    ...draft,
    source: "sms" as const,
    sourceText: "You have paid USD 12.50. ID: DEMO123456.",
  };
  let writes = 0;
  const services = {
    store,
    writeMedia: async () => {
      writes++;
      return "new";
    },
  };
  try {
    const first = await saveFinanceDraft(imported, [], services);
    await expect(saveFinanceDraft(imported, [receipt], services)).rejects.toThrow(
      "duplicate-transaction",
    );
    expect(writes).toBe(0);
    await saveFinanceDraft(
      { ...imported, id: first.id, description: "Corrected sample" },
      [],
      services,
    );
    expect(store.getSnapshot()).toHaveLength(1);
    expect(store.getSnapshot()[0]?.description).toBe("Corrected sample");
  } finally {
    doc.destroy();
  }
});
