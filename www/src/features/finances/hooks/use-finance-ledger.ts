import { type InvoiceDocument, localDay, minorToInput } from "@notables/core";
import { confirmDialog, toast } from "@phe-rus/hino";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createReceiptCapture } from "@/features/finances/lib/create-receipt-capture";
import { financeLedger, ledgerCsv, suggestTransaction } from "@/features/finances/lib/ledger";
import { loadReceiptReader } from "@/features/finances/lib/load-receipt-reader";
import {
  parseMobileMoneyMessages,
  sameImportedTransaction,
} from "@/features/finances/lib/mobile-money";
import { copyPickedReceipts } from "@/features/finances/lib/picked-receipts";
import { saveFinanceDraft } from "@/features/finances/lib/save-finance-draft";
import { ensureFinanceSheets } from "@/features/finances/lib/year-sheets";
import { createFinanceDraft } from "@/features/finances/model/create-finance-draft";
import type {
  FinanceDraft,
  FinanceTransaction,
  LedgerRow,
  MobileMoneySuggestion,
} from "@/features/finances/model/types";
import { getFinanceStore, useTransactions } from "@/features/finances/store/finance-store";
import { getIssuerDefaults } from "@/features/invoices/lib/issuer-profile";
import { getInvoiceStore } from "@/features/invoices/store/invoice-store";
import { getLibrary, useLibraryReady } from "@/features/library/store/library-store";
import { t } from "@/i18n/i18n";
import { saveFile } from "@/platform/save-file";
import { saveMedia } from "@/platform/storage/media-store";

export function useFinanceLedger(documents: InvoiceDocument[]) {
  const transactions = useTransactions();
  const rows = useMemo(() => financeLedger(transactions, documents), [transactions, documents]);
  const ready = useLibraryReady();
  useEffect(() => {
    if (ready) ensureFinanceSheets(getLibrary(), rows);
  }, [ready, rows]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FinanceDraft | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<MobileMoneySuggestion[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();
  const set = (patch: Partial<FinanceDraft>) =>
    setDraft((value) => (value ? { ...value, ...patch } : value));
  const capture = useMemo(
    () =>
      createReceiptCapture(
        { load: loadReceiptReader, copy: copyPickedReceipts },
        {
          onStart: () => {
            setBusy(true);
            setQueue([]);
            setFiles([]);
          },
          onFiles: setFiles,
          onRead: (text) => {
            const suggestion = suggestTransaction(text);
            setDraft({
              ...createFinanceDraft("receipt"),
              ...suggestion,
              currency: suggestion.currency || getIssuerDefaults().currency,
              sourceText: text,
            });
            if (!text.trim()) toast.error(t("capture.scanFailed"));
          },
          onFailure: (stage) => {
            if (stage === "read") setDraft(createFinanceDraft("receipt"));
            toast.error(t("capture.scanFailed"));
          },
          onFinish: () => {
            setBusy(false);
            setScanning(false);
          },
        },
      ),
    [],
  );
  useEffect(
    () => () => {
      capture.cancel();
    },
    [capture],
  );
  const start = (source: FinanceTransaction["source"]) => {
    capture.cancel();
    setBusy(false);
    setScanning(false);
    setFiles([]);
    setQueue([]);
    setDraft(createFinanceDraft(source));
  };
  const closeScanner = () => {
    if (capture.cancel()) setFiles([]);
    setBusy(false);
    setScanning(false);
  };
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await saveFinanceDraft(draft, files, { store: getFinanceStore(), writeMedia: saveMedia });
      const next = queue[0];
      setQueue(queue.slice(1));
      setDraft(
        next ? { ...createFinanceDraft("sms"), ...next, date: next.date || localDay() } : null,
      );
      setFiles([]);
    } catch (error) {
      toast.error(
        t(
          error instanceof Error && error.message === "invalid-transaction"
            ? "finances.invalid"
            : error instanceof Error && error.message === "duplicate-transaction"
              ? "finances.duplicate"
              : "finances.saveFailed",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const exportLedger = async () => {
    try {
      const headings = [
        t("finances.date"),
        t("finances.type"),
        t("finances.description"),
        t("finances.reference"),
        t("finances.currency"),
        t("finances.amount"),
      ];
      const csv = ledgerCsv(rows, headings);
      await saveFile(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
        `finances-${localDay()}.csv`,
        "text/csv",
      );
    } catch {
      toast.error(t("finances.saveFailed"));
    }
  };
  const edit = (row: LedgerRow) => {
    const transaction = transactions.find((item) => item.id === row.id.replace(/:fee$/, ""));
    setOpen(false);
    if (transaction) {
      capture.cancel();
      setBusy(false);
      setQueue([]);
      setFiles([]);
      setDraft({
        ...transaction,
        amount: minorToInput(transaction.amount, transaction.currency),
      });
    } else void navigate({ to: "/invoices/$invoiceId", params: { invoiceId: row.id } });
  };
  const remove = async (row: LedgerRow) => {
    if (
      !(await confirmDialog({
        title: t("finances.removeTitle"),
        message: t("finances.removeHint"),
        confirmLabel: t("common.delete"),
        destructive: true,
      }))
    )
      return;
    const id = row.id.replace(/:fee$/, "");
    if (row.type === "fee") {
      const transaction = transactions.find((item) => item.id === id);
      if (transaction) getFinanceStore().save({ ...transaction, fee: 0 }, id);
    } else if (transactions.some((item) => item.id === id)) getFinanceStore().remove(id);
    else getInvoiceStore().remove(id);
  };
  const closeDraft = () => {
    if (!busy) {
      setDraft(null);
      setFiles([]);
    }
  };
  const skip = () => {
    const next = queue[0];
    setQueue(queue.slice(1));
    if (next) setDraft({ ...createFinanceDraft("sms"), ...next, date: next.date || localDay() });
  };
  const extract = () => {
    if (!draft) return;
    const suggestions =
      draft.source === "sms"
        ? parseMobileMoneyMessages(draft.sourceText).filter(
            (item) =>
              !transactions.some((existing) =>
                sameImportedTransaction(existing, { ...item, source: "sms" }),
              ),
          )
        : [];
    if (draft.source === "sms" && !suggestions.length) {
      toast.error(t("finances.noPayments"));
      return;
    }
    const suggestion = suggestions[0] ?? suggestTransaction(draft.sourceText);
    setQueue(suggestions.slice(1));
    set({ ...suggestion, currency: suggestion.currency || draft.currency });
  };
  return {
    rows,
    open,
    setOpen,
    draft,
    files,
    setFiles,
    scanning,
    setScanning,
    busy,
    queue,
    preview,
    setPreview,
    set,
    start,
    scan: capture.scan,
    pick: capture.pick,
    closeScanner,
    save,
    exportLedger,
    edit,
    remove,
    closeDraft,
    skip,
    extract,
  };
}
