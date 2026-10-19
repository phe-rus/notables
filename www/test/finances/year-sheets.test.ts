import { expect, test } from "bun:test";
import { createMemoryPersistence } from "@notables/sync";
import * as Y from "yjs";
import {
  ensureFinanceSheets,
  FINANCE_FOLDER,
  ledgerCells,
} from "../../src/features/finances/lib/year-sheets";
import { Library } from "../../src/features/library/store/library-store";

const rows = [
  {
    id: "qa",
    date: "2025-12-31",
    description: "Synthetic receipt",
    currency: "UGX",
    amount: 1250,
    type: "expense" as const,
    reference: "QA-1",
  },
];
test("yearly finance sheets converge across devices and preserve folder customisations", async () => {
  const first = new Library(createMemoryPersistence());
  const second = new Library(createMemoryPersistence());
  await Promise.all([first.loaded, second.loaded]);
  const now = new Date(2026, 9, 19).getTime();
  ensureFinanceSheets(first, rows, now);
  ensureFinanceSheets(second, rows, now);
  Y.applyUpdate(first.doc, Y.encodeStateAsUpdate(second.doc));
  expect(first.getFolders().filter((item) => item.id === FINANCE_FOLDER)).toHaveLength(1);
  expect(first.getFolders().find((item) => item.id === FINANCE_FOLDER)?.name).toBe("FINANCES");
  expect(first.get("finance-ledger-2025")).toMatchObject({
    folderId: FINANCE_FOLDER,
    format: "spreadsheet",
    financeYear: 2025,
  });
  expect(first.getSnapshot().filter((item) => item.financeYear)).toHaveLength(2);
  first.renameFolder(FINANCE_FOLDER, "My money");
  ensureFinanceSheets(first, rows, now);
  expect(first.getFolders().find((item) => item.id === FINANCE_FOLDER)?.name).toBe("My money");
  first.removeFolder(FINANCE_FOLDER);
  ensureFinanceSheets(first, rows, now);
  expect(first.getFolders().some((item) => item.id === FINANCE_FOLDER)).toBe(false);
});
test("sheet cells preserve exact amounts and transaction references", () => {
  expect(
    ledgerCells(rows, ["Date", "Type", "Description", "Reference", "Currency", "Amount"]),
  ).toMatchObject({ A2: "2025-12-31", D2: "QA-1", F2: "1250" });
});
