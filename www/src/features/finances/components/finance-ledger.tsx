import { LayoutIcon } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { DocumentScanner } from "@/features/capture/components/document-scanner";
import { useFinanceLedger } from "@/features/finances/hooks/use-finance-ledger";
import type { FinanceLedgerProps } from "@/features/finances/model/types";
import { t } from "@/i18n/i18n";
import { FinanceToolbar } from "./finance-toolbar";
import { LedgerSheet } from "./ledger-sheet";
import { ReceiptPreview } from "./receipt-preview";
import { TransactionSheet } from "./transaction-sheet";

/** One live ledger derived from documents and the person's confirmed transactions. */
export function FinanceLedger({ documents, toolbarHost, onCreateDocument }: FinanceLedgerProps) {
  const {
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
    scan,
    pick,
    closeScanner,
    save,
    exportLedger,
    edit,
    remove,
    closeDraft,
    skip,
    extract,
  } = useFinanceLedger(documents);
  const input = useRef<HTMLInputElement>(null);
  const actions = (
    <FinanceToolbar
      onOpenLedger={() => setOpen(true)}
      onScan={() => {
        setFiles([]);
        setScanning(true);
      }}
      onImportReceipt={() => input.current?.click()}
      onImportMessage={() => start("sms")}
      onNewTransaction={() => start("manual")}
      onCreateDocument={onCreateDocument}
    />
  );
  return (
    <>
      {toolbarHost ? (
        createPortal(actions, toolbarHost)
      ) : (
        <div className="flex justify-end gap-1">{actions}</div>
      )}
      <div className="mx-1.5 mb-3 flex items-center gap-2 rounded-3xl bg-paper px-3 py-2">
        <Button
          variant="ghost"
          onClick={() => setOpen(true)}
          className="min-h-11 min-w-0 grow justify-start px-0 text-start text-subheadline font-semibold text-label [&>span]:w-full [&>span]:justify-start [&>span]:gap-2"
        >
          <LayoutIcon size={20} className="text-accent-text" />
          <span>{t("finances.ledger")}</span>
          <span className="ms-auto text-caption text-label-secondary">{rows.length}</span>
        </Button>
      </div>
      {busy && !draft && (
        <p role="status" className="px-5 pb-3 text-footnote text-label-secondary">
          {t("capture.processing")}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(event) => {
          const picker = event.currentTarget;
          void pick([...(picker.files ?? [])], () => {
            picker.value = "";
          });
        }}
      />
      <DocumentScanner
        mode={scanning ? "document" : null}
        onClose={closeScanner}
        onCapture={scan}
      />
      <LedgerSheet
        open={open}
        rows={rows}
        onClose={() => setOpen(false)}
        onExport={exportLedger}
        onEdit={edit}
        onRemove={remove}
      />
      <TransactionSheet
        draft={draft}
        files={files}
        busy={busy}
        remaining={queue.length}
        onChange={set}
        onPreview={setPreview}
        onSave={save}
        onRemoveFile={(index) => setFiles((items) => items.filter((_, i) => i !== index))}
        onClose={closeDraft}
        onSkip={skip}
        onExtract={extract}
      />
      <ReceiptPreview src={preview} onClose={() => setPreview(null)} />
    </>
  );
}
