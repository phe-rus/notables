import {
  formatMoney,
  type InvoiceDocument,
  localDay,
  localMediaSrc,
  minorToInput,
  parseMoney,
} from "@notables/core";
import { useMediaSource } from "@notables/pluraliti";
import {
  Button,
  CameraIcon,
  CloseIcon,
  IconButton,
  LayoutIcon,
  openMenu,
  PhotoIcon,
  PlusIcon,
  Sheet,
  toast,
} from "@phe-rus/hino";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  DateField,
  Field,
  PickerInput,
  TextArea,
  TextInput,
} from "../../../components/form/form-fields";
import { currentLanguage, t } from "../../../i18n/i18n";
import { saveFile } from "../../../platform/save-file";
import { saveMedia } from "../../../platform/storage/media-store";
import { DocumentScanner } from "../../capture/components/document-scanner";
import { currencyOptions } from "../../invoices/lib/currencies";
import { getIssuerDefaults } from "../../invoices/lib/issuer-profile";
import { financeLedger, ledgerCsv, suggestTransaction } from "../lib/ledger";
import type { FinanceTransaction } from "../model/transaction";
import { getFinanceStore, useTransactions } from "../store/finance-store";

type Draft = Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt" | "amount"> & {
  id?: string;
  amount: string;
};
const draftFor = (source: FinanceTransaction["source"] = "manual"): Draft => ({
  direction: "expense",
  date: localDay(),
  description: "",
  currency: getIssuerDefaults().currency,
  amount: "",
  reference: "",
  source,
  sourceText: "",
  attachments: [],
});

/** One live ledger derived from documents and the person's confirmed transactions. */
export function FinanceLedger({ documents }: { documents: InvoiceDocument[] }) {
  const transactions = useTransactions();
  const rows = useMemo(() => financeLedger(transactions, documents), [transactions, documents]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const set = (patch: Partial<Draft>) =>
    setDraft((value) => (value ? { ...value, ...patch } : value));
  const start = (source: FinanceTransaction["source"]) => {
    setFiles([]);
    setDraft(draftFor(source));
  };
  const scan = async (images: File[]) => {
    setBusy(true);
    setFiles(images);
    try {
      const { prepareCardImage, recognizeCard } = await import("../../wallet/lib/card-recognition");
      const texts: string[] = [];
      for (const image of images.slice(0, 10)) {
        const canvas = await prepareCardImage(image);
        try {
          texts.push(
            (await recognizeCard(canvas, currentLanguage(), () => {}, "document").result).text,
          );
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
      const text = texts.join("\n");
      const suggestion = suggestTransaction(text);
      setDraft({
        ...draftFor("receipt"),
        ...suggestion,
        currency: suggestion.currency || getIssuerDefaults().currency,
        sourceText: text,
      });
      if (!text.trim()) toast.error(t("capture.scanFailed"));
    } catch {
      setDraft(draftFor("receipt"));
      toast.error(t("capture.scanFailed"));
    } finally {
      setBusy(false);
      setScanning(false);
    }
  };
  const save = async () => {
    if (!draft || busy) return;
    const amount = parseMoney(draft.amount, draft.currency);
    if (!amount || !Number.isSafeInteger(amount) || !draft.description.trim()) {
      toast.error(t("finances.invalid"));
      return;
    }
    setBusy(true);
    try {
      // Check imported message identity before writing files or changing the ledger.
      if (
        !draft.id &&
        draft.source === "sms" &&
        transactions.some(
          (item) =>
            item.source === "sms" &&
            ((draft.reference &&
              item.reference === draft.reference &&
              item.currency === draft.currency) ||
              item.sourceText.trim() === draft.sourceText.trim()),
        )
      )
        throw new Error("duplicate-transaction");
      const attachments = [...draft.attachments];
      for (const file of files) attachments.push(localMediaSrc(await saveMedia(file)));
      getFinanceStore().save({ ...draft, amount, attachments }, draft.id);
      setDraft(null);
      setFiles([]);
    } catch (error) {
      toast.error(
        t(
          error instanceof Error && error.message === "duplicate-transaction"
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
  return (
    <>
      <div className="mx-1.5 mb-3 flex items-center gap-2 rounded-3xl bg-paper px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 min-w-0 grow items-center gap-2 text-start text-subheadline font-semibold text-label"
        >
          <LayoutIcon size={20} className="text-accent-text" />
          <span>{t("finances.ledger")}</span>
          <span className="ms-auto text-caption text-label-secondary">{rows.length}</span>
        </button>
        <IconButton
          label={t("finances.add")}
          size="icon-xs"
          onClick={(event) =>
            openMenu(
              event.currentTarget,
              [
                {
                  label: t("finances.transaction"),
                  icon: <PlusIcon size={18} />,
                  onSelect: () => start("manual"),
                },
                {
                  label: t("finances.scanReceipt"),
                  icon: <CameraIcon size={18} />,
                  onSelect: () => {
                    setFiles([]);
                    setScanning(true);
                  },
                },
                {
                  label: t("finances.importReceipt"),
                  icon: <PhotoIcon size={18} />,
                  onSelect: () => input.current?.click(),
                },
                {
                  label: t("finances.importMessage"),
                  icon: <LayoutIcon size={18} />,
                  onSelect: () => start("sms"),
                },
              ],
              { edge: "trailing" },
            )
          }
        >
          <PlusIcon size={17} />
        </IconButton>
      </div>
      {busy && !draft && (
        <p role="status" className="px-5 pb-3 text-footnote text-label-secondary">
          {t("capture.processing")}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const images = [...(event.target.files ?? [])]
            .filter((file) => file.type.startsWith("image/"))
            .slice(0, 10);
          event.target.value = "";
          if (images.length) void scan(images);
        }}
      />
      <DocumentScanner
        mode={scanning ? "document" : null}
        onClose={() => setScanning(false)}
        onCapture={scan}
      />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label={t("finances.ledger")}
        className="max-w-[1000px]"
      >
        <header className="flex items-center gap-3 p-5">
          <h2 className="grow text-title3 font-semibold">{t("finances.ledger")}</h2>
          <Button size="sm" variant="ghost" onClick={() => void exportLedger()}>
            {t("finances.export")}
          </Button>
          <IconButton
            label={t("common.close")}
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
          >
            <CloseIcon size={18} />
          </IconButton>
        </header>
        <p className="px-5 pb-4 text-footnote text-label-secondary">{t("finances.ledgerHint")}</p>
        <div className="overflow-auto px-5 pb-6">
          <table className="w-full text-start text-subheadline">
            <thead>
              <tr>
                {["date", "type", "description", "reference", "currency", "amount"].map((key) => (
                  <th
                    key={key}
                    className="border-b border-separator px-3 py-2 text-start text-caption font-semibold text-label-secondary"
                  >
                    {t(
                      `finances.${key as "date" | "type" | "description" | "reference" | "currency" | "amount"}`,
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-separator/50">
                  <td className="whitespace-nowrap px-3 py-3">{row.date}</td>
                  <td className="px-3 py-3">{t(`finances.${row.type}`)}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="min-w-32 text-start text-accent-text"
                      onClick={() => {
                        const transaction = transactions.find((item) => item.id === row.id);
                        setOpen(false);
                        if (transaction) {
                          setFiles([]);
                          setDraft({
                            ...transaction,
                            amount: minorToInput(transaction.amount, transaction.currency),
                          });
                        } else
                          void navigate({
                            to: "/invoices/$invoiceId",
                            params: { invoiceId: row.id },
                          });
                      }}
                    >
                      {row.description}
                    </button>
                  </td>
                  <td className="px-3 py-3">{row.reference}</td>
                  <td className="px-3 py-3">{row.currency}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-end tabular-nums">
                    {formatMoney(row.amount, row.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-10 text-center text-footnote text-label-secondary">
              {t("finances.empty")}
            </p>
          )}
        </div>
      </Sheet>
      <Sheet
        open={draft !== null}
        onClose={() => {
          if (!busy) {
            setDraft(null);
            setFiles([]);
          }
        }}
        label={t("finances.transaction")}
        className="max-w-[540px]"
      >
        {draft && (
          <form
            className="flex flex-col gap-4 overflow-auto p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <h2 className="text-title3 font-semibold">{t("finances.transaction")}</h2>
            {draft.source !== "manual" && (
              <>
                <p className="text-footnote text-label-secondary">{t("finances.reviewHint")}</p>
                <Field
                  label={t(draft.source === "sms" ? "finances.message" : "capture.reviewText")}
                >
                  <TextArea
                    value={draft.sourceText}
                    onChange={(event) => set({ sourceText: event.target.value })}
                  />
                </Field>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    const suggestion = suggestTransaction(draft.sourceText);
                    set({ ...suggestion, currency: suggestion.currency || draft.currency });
                  }}
                >
                  {t("finances.extract")}
                </Button>
              </>
            )}
            <Field label={t("finances.type")}>
              <PickerInput
                label={t("finances.type")}
                value={draft.direction}
                onChange={(direction) => set({ direction })}
                options={[
                  { value: "income", label: t("finances.income") },
                  { value: "expense", label: t("finances.expense") },
                ]}
              />
            </Field>
            <Field label={t("finances.description")}>
              <TextInput
                value={draft.description}
                required
                maxLength={200}
                onChange={(event) => set({ description: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("finances.amount")}>
                <TextInput
                  inputMode="decimal"
                  required
                  value={draft.amount}
                  onChange={(event) => set({ amount: event.target.value })}
                />
              </Field>
              <Field label={t("finances.currency")}>
                <PickerInput
                  label={t("finances.currency")}
                  value={draft.currency}
                  options={currencyOptions(draft.currency)}
                  onChange={(currency) => set({ currency })}
                />
              </Field>
            </div>
            <DateField
              label={t("finances.date")}
              value={draft.date}
              onChange={(date) => set({ date })}
            />
            <Field label={t("finances.reference")}>
              <TextInput
                value={draft.reference}
                onChange={(event) => set({ reference: event.target.value })}
              />
            </Field>
            {draft.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {draft.attachments.map((src) => (
                  <ReceiptImage key={src} src={src} />
                ))}
              </div>
            )}
            {files.length > 0 && (
              <p className="text-caption text-label-secondary">
                {files.map((file) => file.name).join(", ")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setDraft(null);
                  setFiles([]);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy || !draft.amount || !draft.description.trim()}>
                {busy ? t("capture.processing") : t("common.save")}
              </Button>
            </div>
          </form>
        )}
      </Sheet>
    </>
  );
}

function ReceiptImage({ src }: { src: string }) {
  const resolved = useMediaSource(src);
  return resolved ? (
    <img
      src={resolved}
      alt={t("finances.receipt")}
      className="w-full rounded-xl border border-separator object-contain"
    />
  ) : null;
}
