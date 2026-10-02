import { computeTotals, formatMoney, type InvoiceDocument, type InvoiceKind } from "@notables/core";
import {
  Button,
  ChevronLeftIcon,
  cn,
  confirmDialog,
  DownloadIcon,
  ExpandIcon,
  IconButton,
  Popover,
  PrintIcon,
  SegmentedControl,
  Select,
  TrashIcon,
  toast,
  useDismiss,
} from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Field, FormSection, TextArea, TextInput } from "../../../components/form/form-fields";
import { printPage } from "../../../platform/print-page";
import { RecentClientPicker } from "../business/recent-client-picker";
import { exportInvoicePdf } from "../export/export-invoice";
import {
  draftBusinessProfile,
  saveBusinessProfile,
  useBusinessProfile,
} from "../lib/business-profile";
import { currencyOptions } from "../lib/currencies";
import { useInvoiceSeal } from "../lib/use-invoice-seal";
import { getInvoiceStore } from "../store/invoice-store";
import { InvoicePaper } from "./invoice-paper";
import { LineItemsEditor } from "./line-items-editor";
import { MoneyInput } from "./money-input";
import { PaperFullscreen } from "./paper-fullscreen";
import { PaperPreview } from "./paper-preview";
import { PartyFields } from "./party-fields";
import { StylePanel } from "./style-panel";

/**
 * Write an invoice, receipt or quote on the left and watch the signed page
 * update on the right. On narrow screens the two take turns.
 */
export function InvoiceScreen({ invoice }: { invoice: InvoiceDocument }) {
  const navigate = useNavigate();
  const store = getInvoiceStore();
  const { link, issuerId } = useInvoiceSeal(invoice);
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const set = useCallback(
    (patch: Partial<InvoiceDocument>) => store.update(invoice.id, patch),
    [store, invoice.id],
  );
  const totals = computeTotals(invoice);

  const [exporting, setExporting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const downloadPdf = async () => {
    if (!link || !issuerId) return;
    setExporting(true);
    const id = toast.loading("Preparing your PDF…");
    try {
      const outcome = await exportInvoicePdf(invoice, link, issuerId);
      if (outcome === "saved") {
        toast.update(id, "success", "PDF saved", { description: "Signed and ready to send." });
      } else toast.dismiss(id);
    } catch (error) {
      console.error(error);
      toast.update(id, "error", "Couldn’t create the PDF", { description: "Please try again." });
    } finally {
      setExporting(false);
    }
  };

  const print = () => {
    printPage().catch(() =>
      toast.error("Printing isn’t available here. Download the PDF instead."),
    );
  };

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: `Delete this ${invoice.kind}?`,
      message: "Copies you already sent stay verifiable; only this device forgets it.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    store.remove(invoice.id);
    toast(`${invoice.number} deleted`);
    void navigate({ to: "/invoices" });
  };

  const duplicate = () => {
    const copy = store.duplicate(invoice.id);
    if (copy) {
      toast.success("Duplicated", { description: copy.number });
      void navigate({ to: "/invoices/$invoiceId", params: { invoiceId: copy.id } });
    }
  };

  const issueReceipt = () => {
    const receipt = store.receiptFor(invoice.id);
    if (receipt) {
      toast.success("Receipt ready", { description: `${receipt.number} for ${invoice.number}` });
      void navigate({ to: "/invoices/$invoiceId", params: { invoiceId: receipt.id } });
    }
  };

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Verification link copied", {
      description: "Anyone can open it to check this document.",
    });
  };

  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="glass-bar sticky top-0 z-20 flex box-content h-14 shrink-0 items-center gap-2 px-3 pt-[env(safe-area-inset-top)] md:px-5"
      >
        <Link
          to="/invoices"
          className="flex items-center text-[17px] text-accent-text no-underline md:hidden"
          aria-label="Back to invoices"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <div className="max-md:hidden">
          <SegmentedControl<InvoiceKind>
            label="Document type"
            value={invoice.kind}
            onChange={(kind) =>
              set({
                kind,
                dueOn: kind === "receipt" ? null : (invoice.dueOn ?? invoice.issuedOn),
              })
            }
            options={[
              { value: "invoice", label: "Invoice" },
              { value: "receipt", label: "Receipt" },
              { value: "quote", label: "Quote" },
            ]}
          />
        </div>
        <div className="xl:hidden">
          <SegmentedControl<"edit" | "preview">
            label="View"
            value={pane}
            onChange={setPane}
            options={[
              { value: "edit", label: "Edit" },
              { value: "preview", label: "Preview" },
            ]}
          />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <StyleButton invoice={invoice} onChange={(style) => set({ style })} />
          <IconButton label="Delete" onClick={remove}>
            <TrashIcon size={19} />
          </IconButton>
          <IconButton label="Full-screen preview" onClick={() => setFullscreen(true)}>
            <ExpandIcon size={19} />
          </IconButton>
          <IconButton label="Print" onClick={print}>
            <PrintIcon size={19} />
          </IconButton>
          <Button
            variant="primary"
            onClick={downloadPdf}
            disabled={exporting || !link}
            aria-label="Download PDF"
          >
            <DownloadIcon size={16} />
            <span className="max-sm:hidden">{exporting ? "Preparing…" : "Download PDF"}</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 grow">
        <div
          className={cn(
            "w-full shrink-0 overflow-y-auto border-separator/70 xl:block xl:w-[440px] xl:border-r",
            pane === "edit" ? "block" : "hidden",
          )}
        >
          <form
            className="mx-auto flex max-w-[560px] flex-col gap-7 px-5 pt-5 pb-24"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="md:hidden [&>fieldset]:w-full">
              <SegmentedControl<InvoiceKind>
                label="Document type"
                value={invoice.kind}
                onChange={(kind) =>
                  set({
                    kind,
                    dueOn: kind === "receipt" ? null : (invoice.dueOn ?? invoice.issuedOn),
                  })
                }
                options={[
                  { value: "invoice", label: "Invoice" },
                  { value: "receipt", label: "Receipt" },
                  { value: "quote", label: "Quote" },
                ]}
              />
            </div>
            <FormSection title="Details">
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Number">
                  <TextInput
                    value={invoice.number}
                    onChange={(e) => set({ number: e.target.value })}
                  />
                </Field>
                <Field label="Currency">
                  <Select
                    label="Currency"
                    value={invoice.currency}
                    onChange={(currency) => set({ currency })}
                    options={currencyOptions(invoice.currency)}
                  />
                </Field>
                <Field label={invoice.kind === "receipt" ? "Date paid" : "Date of issue"}>
                  <TextInput
                    type="date"
                    value={invoice.issuedOn}
                    onChange={(e) => e.target.value && set({ issuedOn: e.target.value })}
                  />
                </Field>
                {invoice.kind !== "receipt" && (
                  <Field label={invoice.kind === "quote" ? "Valid until" : "Due"}>
                    <TextInput
                      type="date"
                      value={invoice.dueOn ?? ""}
                      onChange={(e) => set({ dueOn: e.target.value || null })}
                    />
                  </Field>
                )}
              </div>
            </FormSection>

            <FormSection title="From" aside={<SaveAsBusiness invoice={invoice} />}>
              <PartyFields
                party={invoice.issuer}
                namePlaceholder="Your name or business"
                onChange={(issuer) => set({ issuer })}
              />
            </FormSection>

            <FormSection title={invoice.kind === "receipt" ? "Received from" : "Bill to"}>
              <RecentClientPicker invoice={invoice} onPick={(client) => set({ client })} />
              <PartyFields
                party={invoice.client}
                namePlaceholder="Client name"
                onChange={(client) => set({ client })}
              />
            </FormSection>

            <FormSection
              title="Items"
              aside={
                <span className="text-[13px] font-semibold tabular-nums">
                  {formatMoney(totals.total, invoice.currency)}
                </span>
              }
            >
              <LineItemsEditor
                items={invoice.items}
                currency={invoice.currency}
                onChange={(items) => set({ items })}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Discount">
                  <MoneyInput
                    label="Discount"
                    value={invoice.discount}
                    currency={invoice.currency}
                    onChange={(discount) => set({ discount })}
                  />
                </Field>
                <Field label="Tax rate (%)">
                  <TextInput
                    inputMode="decimal"
                    value={invoice.taxRate ? String(invoice.taxRate) : ""}
                    placeholder="0"
                    onChange={(e) => {
                      const rate = Number(e.target.value.replace(",", "."));
                      if (Number.isFinite(rate) && rate >= 0 && rate <= 100) set({ taxRate: rate });
                    }}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Payment and notes">
              <Field label={invoice.kind === "receipt" ? "Paid with" : "How to pay"}>
                <TextArea
                  rows={3}
                  value={invoice.paymentDetails}
                  placeholder="Bank account, mobile money number or payment link"
                  onChange={(e) => set({ paymentDetails: e.target.value })}
                />
              </Field>
              <Field label="Notes">
                <TextArea value={invoice.notes} onChange={(e) => set({ notes: e.target.value })} />
              </Field>
            </FormSection>

            <FormSection title="Seal">
              <div className="flex flex-col gap-3 rounded-[16px] bg-fill/60 p-4 text-[13px] leading-snug text-label-secondary">
                <p>
                  Every {invoice.kind} is signed on this device. The code on the page lets anyone
                  check it’s genuine and unchanged, and the issuer ID shows it came from you.
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>Your issuer ID</span>
                  <span className="font-mono text-[13px] font-semibold text-label">
                    {issuerId ?? "…"}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={copyLink} disabled={!link}>
                    Copy verification link
                  </Button>
                  <Button variant="secondary" onClick={duplicate}>
                    Duplicate
                  </Button>
                  {invoice.kind === "invoice" && (
                    <Button variant="secondary" onClick={issueReceipt}>
                      Issue receipt
                    </Button>
                  )}
                </div>
              </div>
            </FormSection>
          </form>
        </div>

        <div
          className={cn(
            "min-w-0 grow overflow-y-auto bg-fill/40 xl:block",
            pane === "preview" ? "block" : "hidden",
          )}
        >
          <button
            type="button"
            aria-label="Open full-screen preview"
            onClick={() => setFullscreen(true)}
            className="block w-full cursor-zoom-in text-left"
          >
            <PaperPreview invoice={invoice} verifyLink={link} issuerId={issuerId} />
          </button>
        </div>
      </div>

      <PaperFullscreen
        open={fullscreen}
        invoice={invoice}
        verifyLink={link}
        issuerId={issuerId}
        onClose={() => setFullscreen(false)}
        onDownload={downloadPdf}
        onPrint={print}
        downloading={exporting}
      />
      {createPortal(
        <div className="print-root">
          <InvoicePaper invoice={invoice} verifyLink={link} issuerId={issuerId} />
        </div>,
        window.document.body,
      )}
    </div>
  );
}

function StyleButton({
  invoice,
  onChange,
}: {
  invoice: InvoiceDocument;
  onChange: (style: InvoiceDocument["style"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  return (
    <div ref={root} className="relative">
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Style"
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="size-3.5 rounded-full ring-1 ring-black/10"
          style={{ background: invoice.style.accent }}
        />
        <span className="max-sm:hidden">Style</span>
      </Button>
      <Popover
        open={open}
        id={panelId}
        role="dialog"
        aria-label="Document style"
        origin="top-right"
        className="top-[calc(100%+10px)] right-0 w-[330px] max-w-[calc(100vw-24px)] p-5"
      >
        <StylePanel style={invoice.style} onChange={onChange} />
      </Popover>
    </div>
  );
}

/**
 * Keeps this document's sender, look and payment details as the business
 * every new document starts with. Hidden once they already match.
 */
function SaveAsBusiness({ invoice }: { invoice: InvoiceDocument }) {
  const business = useBusinessProfile();
  const same =
    business !== null &&
    JSON.stringify(business.issuer) === JSON.stringify(invoice.issuer) &&
    JSON.stringify(business.style) === JSON.stringify(invoice.style) &&
    business.paymentDetails === invoice.paymentDetails &&
    business.currency === invoice.currency &&
    business.taxRate === invoice.taxRate;
  if (same || !invoice.issuer.name.trim()) return null;
  return (
    <button
      type="button"
      onClick={() => {
        saveBusinessProfile({
          ...draftBusinessProfile(),
          issuer: { ...invoice.issuer },
          style: { ...invoice.style },
          paymentDetails: invoice.paymentDetails,
          currency: invoice.currency,
          taxRate: invoice.taxRate,
        });
        toast.success(business ? "Business details updated" : "Saved as your business", {
          description: "New documents start with these details.",
        });
      }}
      className="text-[13px] font-medium text-accent-text"
    >
      {business ? "Update my business" : "Save as my business"}
    </button>
  );
}
