import { Button } from "@phe-rus/hino/button";
import { Sheet } from "@phe-rus/hino/sheet";
import { TextEditor } from "@phe-rus/hino/text-editor";
import { TextField } from "@phe-rus/hino/text-field";
import { DateField, Field, PickerInput } from "@/components/form/form-fields";
import type { TransactionSheetProps } from "@/features/finances/model/types";
import { currencyOptions } from "@/features/invoices/lib/currencies";
import { t } from "@/i18n/i18n";
import { FeeInput } from "./fee-input";
import { PendingReceipt } from "./pending-receipt";
import { ReceiptTile } from "./receipt-tile";

export function TransactionSheet({
  draft,
  files,
  busy,
  remaining,
  onChange,
  onClose,
  onSave,
  onExtract,
  onSkip,
  onPreview,
  onRemoveFile,
}: TransactionSheetProps) {
  return (
    <Sheet
      open={draft !== null}
      onClose={onClose}
      label={t("finances.transaction")}
      className="max-w-[540px]"
    >
      {draft && (
        <form
          className="flex flex-col gap-4 overflow-auto p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <h2 className="text-title3 font-semibold">{t("finances.transaction")}</h2>
          {draft.source !== "manual" && (
            <>
              <p className="text-footnote text-label-secondary">{t("finances.reviewHint")}</p>
              <Field
                className="gap-2 [&>span]:text-subheadline [&>span]:font-semibold [&>span]:text-label"
                label={t(draft.source === "sms" ? "finances.message" : "capture.reviewText")}
              >
                <TextEditor
                  rows={2}
                  className="min-h-0 resize-none text-subheadline"
                  value={draft.sourceText}
                  onChange={(event) => onChange({ sourceText: event.target.value })}
                />
              </Field>
              <Button size="sm" variant="secondary" type="button" onClick={onExtract}>
                {t("finances.extract")}
              </Button>
            </>
          )}
          {remaining > 0 && (
            <p role="status" className="text-footnote text-label-secondary">
              {t("finances.remaining", { count: remaining })}
            </p>
          )}
          <Field
            className="gap-2 [&>span]:text-subheadline [&>span]:font-semibold [&>span]:text-label"
            label={t("finances.type")}
          >
            <PickerInput
              label={t("finances.type")}
              value={
                draft.category && draft.category !== "payment" ? draft.category : draft.direction
              }
              onChange={(type) =>
                onChange(
                  type === "income" || type === "expense"
                    ? { direction: type, category: "payment" }
                    : { category: type, direction: type === "borrowing" ? "income" : "expense" },
                )
              }
              options={[
                { value: "income", label: t("finances.income") },
                { value: "expense", label: t("finances.expense") },
                { value: "borrowing", label: t("finances.borrowing") },
                { value: "repayment", label: t("finances.repayment") },
                { value: "transfer", label: t("finances.transfer") },
              ]}
            />
          </Field>
          <TextField
            label={t("finances.description")}
            className="h-9 text-subheadline"
            value={draft.description}
            required
            maxLength={200}
            onChange={(event) => onChange({ description: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t("finances.amount")}
              className="h-9 text-subheadline"
              inputMode="decimal"
              required
              value={draft.amount}
              onChange={(event) => onChange({ amount: event.target.value })}
            />
            <Field
              className="gap-2 [&>span]:text-subheadline [&>span]:font-semibold [&>span]:text-label"
              label={t("finances.currency")}
            >
              <PickerInput
                label={t("finances.currency")}
                value={draft.currency}
                options={currencyOptions(draft.currency)}
                onChange={(currency) => onChange({ currency })}
              />
            </Field>
          </div>

          <FeeInput
            key={`${draft.id ?? draft.sourceText}:${draft.currency}`}
            amount={draft.fee ?? 0}
            currency={draft.currency}
            onChange={(fee) => onChange({ fee })}
          />
          <DateField
            label={t("finances.date")}
            value={draft.date}
            onChange={(date) => onChange({ date })}
          />
          <TextField
            label={t("finances.reference")}
            className="h-9 text-subheadline"
            value={draft.reference}
            onChange={(event) => onChange({ reference: event.target.value })}
          />
          {(draft.attachments.length > 0 || files.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {draft.attachments.map((src) => (
                <ReceiptTile
                  key={src}
                  src={src}
                  onPreview={onPreview}
                  onRemove={() =>
                    onChange({ attachments: draft.attachments.filter((item) => item !== src) })
                  }
                />
              ))}
              {files.map((file, index) => (
                <PendingReceipt
                  key={`${file.name}:${index}`}
                  file={file}
                  onPreview={onPreview}
                  onRemove={() => onRemoveFile(index)}
                />
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            {remaining > 0 && (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onSkip}>
                {t("setup.skip")}
              </Button>
            )}
            <Button size="sm" type="button" variant="ghost" disabled={busy} onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={busy || !draft.amount || !draft.description.trim()}
            >
              {busy ? t("capture.processing") : t("common.save")}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
