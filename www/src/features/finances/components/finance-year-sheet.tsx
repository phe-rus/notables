import { useMemo } from "react";
import type * as Y from "yjs";
import { financeLedger, ledgerCsv } from "@/features/finances/lib/ledger";
import { ledgerCells } from "@/features/finances/lib/year-sheets";
import { useTransactions } from "@/features/finances/store/finance-store";
import { useInvoices } from "@/features/invoices/store/invoice-store";
import type { LibraryEntry } from "@/features/library/store/library-store";
import { SpreadsheetEditor } from "@/features/spreadsheets/components/spreadsheet-editor";
import { t } from "@/i18n/i18n";

/** A live yearly view of the ledger, never a second set of financial records. */
export function FinanceYearSheet({ doc, entry }: { doc: Y.Doc; entry: LibraryEntry }) {
  const transactions = useTransactions();
  const documents = useInvoices();
  const projection = useMemo(() => {
    const rows = financeLedger(transactions, documents).filter(
      (row) => Number(row.date.slice(0, 4)) === entry.financeYear,
    );
    const headings = [
      t("finances.date"),
      t("finances.type"),
      t("finances.description"),
      t("finances.reference"),
      t("finances.currency"),
      t("finances.amount"),
    ];
    return {
      cells: ledgerCells(rows, headings),
      rows: rows.length + 1,
      csv: ledgerCsv(rows, headings),
    };
  }, [transactions, documents, entry.financeYear]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-4 py-2 text-footnote text-label-secondary">{t("finances.yearSheetHint")}</p>
      <SpreadsheetEditor doc={doc} entry={entry} projection={projection} />
    </div>
  );
}
