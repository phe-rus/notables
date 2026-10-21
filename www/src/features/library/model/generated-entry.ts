import type { LibraryEntry } from "../store/library-store";

/** The canonical finance rows own these sheets; deleting a view must not hide the ledger. */
export function isGeneratedLedger(entry: LibraryEntry | undefined): boolean {
  return (
    !!entry &&
    entry.origin === "finance-ledger" &&
    Number.isInteger(entry.financeYear) &&
    entry.id === `finance-ledger-${entry.financeYear}`
  );
}
