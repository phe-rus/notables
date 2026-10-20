import type { InvoiceDocument } from "@notables/core";

export type FinanceTransaction = {
  id: string;
  direction: "income" | "expense";
  date: string;
  description: string;
  currency: string;
  /** Integer minor units, matching the invoice engine. */
  amount: number;
  reference: string;
  category?: "payment" | "borrowing" | "repayment" | "transfer";
  /** Fee in minor units, kept separate from the principal. */
  fee?: number;
  source: "manual" | "receipt" | "sms";
  sourceText: string;
  attachments: string[];
  createdAt: number;
  updatedAt: number;
};

export type LedgerRow = {
  id: string;
  date: string;
  description: string;
  currency: string;
  amount: number;
  type:
    | "income"
    | "expense"
    | "invoice"
    | "receipt"
    | "quote"
    | "borrowing"
    | "repayment"
    | "transfer"
    | "fee";
  reference: string;
};

export type MobileMoneySuggestion = {
  currency: string;
  amount: string;
  direction: FinanceTransaction["direction"];
  category: NonNullable<FinanceTransaction["category"]>;
  description: string;
  reference: string;
  date?: string;
  fee: number;
  sourceText: string;
};

export type FinanceDraft = Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt" | "amount"> & {
  id?: string;
  amount: string;
};
export type FinanceLedgerProps = { documents: InvoiceDocument[] };
export type ReceiptImageProps = { src: string };
export type ReceiptTileProps = ReceiptImageProps & {
  onPreview: (src: string) => void;
  onRemove: () => void;
};
export type PendingReceiptProps = Omit<ReceiptTileProps, "src"> & { file: File };
export type ReceiptPreviewProps = { src: string | null; onClose: () => void };
export type FeeInputProps = { amount: number; currency: string; onChange: (value: number) => void };
export type LedgerSheetProps = {
  open: boolean;
  rows: readonly LedgerRow[];
  onClose: () => void;
  onExport: () => Promise<void>;
  onEdit: (row: LedgerRow) => void;
  onRemove: (row: LedgerRow) => Promise<void>;
};
export type TransactionSheetProps = {
  draft: FinanceDraft | null;
  files: readonly File[];
  busy: boolean;
  remaining: number;
  onChange: (patch: Partial<FinanceDraft>) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  onExtract: () => void;
  onSkip: () => void;
  onPreview: (src: string) => void;
  onRemoveFile: (index: number) => void;
};

export type FinanceTransactionDraft = Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">;
export type FinanceSaveServices = {
  store: {
    validate: (draft: FinanceTransactionDraft, id?: string) => void;
    save: (draft: FinanceTransactionDraft, id?: string) => FinanceTransaction;
  };
  writeMedia: (file: File) => Promise<string>;
};

export type ReceiptFrame = { width: number; height: number };
export type ReceiptTextReader<Frame> = {
  read: (frame: Frame) => Promise<{ text: string }>;
  stop: () => void;
};
export type ReceiptReaderTools<Frame> = {
  prepare: (file: File) => Promise<Frame>;
  createReader: () => ReceiptTextReader<Frame>;
};
export type ReceiptCaptureServices<Frame> = {
  load: () => Promise<ReceiptReaderTools<Frame>>;
  copy: (files: readonly File[], release: () => void) => Promise<File[]>;
};
export type ReceiptCaptureObserver = {
  onStart: () => void;
  onFiles: (files: File[]) => void;
  onRead: (text: string) => void;
  onFailure: (stage: "copy" | "read") => void;
  onFinish: () => void;
};
export type ReceiptCaptureOperation<Frame> = {
  reader?: ReceiptTextReader<Frame>;
  frame?: Frame;
};
