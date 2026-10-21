import { expect, test } from "bun:test";
import { createMemoryPersistence } from "@notables/sync";
import * as Y from "yjs";
import {
  ensureFinanceSheets,
  FINANCE_FOLDER,
  ledgerCells,
} from "@/features/finances/lib/year-sheets";
import { Library } from "@/features/library/store/library-store";

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
  expect(first.getFolders().some((item) => item.id === FINANCE_FOLDER)).toBe(true);
});
test("sheet cells preserve exact amounts and transaction references", () => {
  expect(
    ledgerCells(rows, ["Date", "Type", "Description", "Reference", "Currency", "Amount"]),
  ).toMatchObject({ A2: "2025-12-31", D2: "QA-1", F2: "1250" });
});

test("generated ledger sheets resist trash and permanent deletion without affecting ordinary notes", async () => {
  const library = new Library(createMemoryPersistence());
  await library.loaded;
  ensureFinanceSheets(library, rows, new Date(2026, 9, 21).getTime());
  const note = library.create("note", FINANCE_FOLDER);
  library.update("finance-ledger-2026", { trashedAt: Date.now() });
  expect(library.get("finance-ledger-2026")?.trashedAt).toBeFalsy();
  expect(library.noteTrash.has("finance-ledger-2026")).toBe(false);
  await library.remove("finance-ledger-2026");
  expect(library.get("finance-ledger-2026")?.financeYear).toBe(2026);
  expect(library.removedNotes.has("finance-ledger-2026")).toBe(false);
  library.update(note.id, { trashedAt: Date.now() });
  expect(library.get(note.id)?.trashedAt).toBeTruthy();
  await library.remove(note.id);
  expect(library.get(note.id)).toBeUndefined();
});
