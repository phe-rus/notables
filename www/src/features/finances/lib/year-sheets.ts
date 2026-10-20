import { minorToInput } from "@notables/core";
import type { Library } from "@/features/library/store/library-store";
import { t } from "@/i18n/i18n";
import type { LedgerRow } from "./ledger";

export const FINANCE_FOLDER = "default-finances";

/** Stable identities let two linked devices create the same yearly sheets safely. */
export function ensureFinanceSheets(
  library: Library,
  rows: readonly LedgerRow[],
  now = Date.now(),
) {
  if (!library.ready || library.removedFolders.has(FINANCE_FOLDER)) return;
  library.doc.transact(() => {
    if (!library.folders.has(FINANCE_FOLDER))
      library.folders.set(FINANCE_FOLDER, {
        id: FINANCE_FOLDER,
        name: t("finances.folderName"),
        color: "sage",
        createdAt: now,
        order: Math.max(-1, ...library.getFolders().map((item) => item.order)) + 1,
      });
    const years = new Set([
      new Date(now).getFullYear(),
      ...rows.map((row) => Number(row.date.slice(0, 4))),
    ]);
    for (const year of years) {
      if (!Number.isInteger(year) || year < 1 || year > 9999) continue;
      const id = `finance-ledger-${year}`;
      if (library.get(id)) continue;
      library.receive({
        id,
        kind: "note",
        title: `${t("finances.ledger")} ${year}`,
        origin: "finance-ledger",
      });
      library.update(id, { format: "spreadsheet", financeYear: year, folderId: FINANCE_FOLDER });
    }
  });
}

export function ledgerCells(
  rows: readonly LedgerRow[],
  headings: readonly string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = [
    headings,
    ...rows.map((row) => [
      row.date,
      t(`finances.${row.type}`),
      row.description,
      row.reference,
      row.currency,
      minorToInput(row.amount, row.currency),
    ]),
  ];
  lines.forEach((line, index) => {
    line.forEach((value, column) => {
      result[`${String.fromCharCode(65 + column)}${index + 1}`] = value;
    });
  });
  return result;
}
