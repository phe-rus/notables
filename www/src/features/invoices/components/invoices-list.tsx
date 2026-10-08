import {
  computeTotals,
  formatMoney,
  type InvoiceDocument,
  type InvoiceKind,
  invoiceKindLabels,
} from "@notables/core";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BusinessIcon,
  Chip,
  cn,
  confirmDialog,
  IconButton,
  openMenu,
  PlusIcon,
  SidebarIcon,
  spring,
  toast,
  useContextMenu,
} from "@ultrapeach/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { t } from "../../../i18n/i18n";
import { usePreferences } from "../../settings/store/preferences-store";
import { BusinessSheet } from "../business/business-sheet";
import { useBusinessProfile } from "../lib/business-profile";
import { getInvoiceStore, useInvoices } from "../store/invoice-store";
import { InvoicePaper, PAPER_HEIGHT, PAPER_WIDTH } from "./invoice-paper";

const dueFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function InvoicesList({
  activeId,
  onOpenSidebar,
  className,
}: {
  activeId?: string;
  onOpenSidebar: () => void;
  className?: string;
}) {
  const all = useInvoices();
  const [filter, setFilter] = useState<"all" | InvoiceKind>("all");
  const invoices = filter === "all" ? all : all.filter((invoice) => invoice.kind === filter);
  const navigate = useNavigate();
  const { collapsed } = usePreferences().sidebar;
  const business = useBusinessProfile();
  const [businessOpen, setBusinessOpen] = useState(false);

  const create = (kind: InvoiceKind) => {
    const invoice = getInvoiceStore().create(kind);
    void navigate({ to: "/invoices/$invoiceId", params: { invoiceId: invoice.id } });
  };

  return (
    <section
      aria-label="Invoices and receipts"
      className={cn(
        "flex w-full flex-col bg-surface md:w-[330px] md:shrink-0 md:border-r md:border-separator/70",
        className,
      )}
    >
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-title2 font-bold tracking-tight">{t("invoices.title")}</h1>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label={
                business
                  ? `${t("invoices.yourBusiness")}: ${business.issuer.name}`
                  : t("invoices.setUpBusiness")
              }
              onClick={() => setBusinessOpen(true)}
            >
              <BusinessIcon size={20} />
            </IconButton>
            <IconButton
              label="New invoice, receipt or quote"
              tone="accent"
              onClick={(event) => {
                openMenu(
                  event.currentTarget,
                  (["invoice", "receipt", "quote"] as const).map((kind) => ({
                    label: `New ${invoiceKindLabels[kind].toLowerCase()}`,
                    onSelect: () => create(kind),
                  })),
                  { edge: "trailing" },
                );
              }}
            >
              <PlusIcon size={20} strokeWidth={2} />
            </IconButton>
          </div>
        </div>
        <nav aria-label="Document type" className="flex flex-wrap gap-1.5">
          {(["all", "invoice", "receipt", "quote"] as const).map((kind) => {
            const selected = filter === kind;
            const count = kind === "all" ? all.length : all.filter((i) => i.kind === kind).length;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(kind)}
                className={cn(
                  "relative isolate flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-footnote font-medium transition-colors",
                  selected ? "text-on-inverse" : "bg-fill/70 text-label-secondary hover:text-label",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="invoice-filter"
                    className="absolute inset-0 -z-10 rounded-full bg-inverse"
                    transition={spring.snappy}
                  />
                )}
                {kind === "all" ? "All" : `${invoiceKindLabels[kind]}s`}
                <span
                  className={cn("tabular-nums", selected ? "opacity-70" : "text-label-tertiary")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex grow flex-col overflow-y-auto px-2.5 pb-28 md:pb-8">
        {!business && all.length > 0 && (
          <button
            type="button"
            onClick={() => setBusinessOpen(true)}
            className="mx-1.5 mb-2 flex items-center gap-3 rounded-3xl bg-accent/10 px-3.5 py-3 text-left transition-colors hover:bg-accent/15"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
              <BusinessIcon size={18} />
            </span>
            <span className="flex flex-col">
              <span className="text-[14px] font-semibold">{t("invoices.setUpBusiness")}</span>
              <span className="text-[12.5px] leading-snug text-label-secondary">
                {t("invoices.setUpBusinessBody")}
              </span>
            </span>
          </button>
        )}
        {all.length > 0 && invoices.length === 0 && (
          <p className="px-6 pt-12 text-center text-[14px] text-label-secondary">
            No {filter === "all" ? "documents" : `${invoiceKindLabels[filter].toLowerCase()}s`} yet.
          </p>
        )}
        {all.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <p className="text-subheadline font-semibold">Get paid, beautifully</p>
            <p className="text-[14px] leading-snug text-label-secondary">
              Invoices, receipts and quotes, signed on this device so anyone can scan them to check
              they’re genuine.
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {invoices.map((invoice) => (
            <motion.div
              key={invoice.id}
              layout="position"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={spring.smooth}
            >
              <InvoiceRow invoice={invoice} active={invoice.id === activeId} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <BusinessSheet open={businessOpen} onClose={() => setBusinessOpen(false)} />
    </section>
  );
}

function InvoiceRow({ invoice, active }: { invoice: InvoiceDocument; active: boolean }) {
  const navigate = useNavigate();
  const store = getInvoiceStore();
  const total = computeTotals(invoice).total;
  const open = (id: string) =>
    void navigate({ to: "/invoices/$invoiceId", params: { invoiceId: id } });
  const menu = useContextMenu(() => [
    { label: "Open", onSelect: () => open(invoice.id) },
    {
      label: "Duplicate",
      onSelect: () => {
        const copy = store.duplicate(invoice.id);
        if (copy) {
          toast.success("Duplicated", { description: copy.number });
          open(copy.id);
        }
      },
    },
    ...(invoice.kind === "invoice"
      ? [
          {
            label: "Issue receipt",
            onSelect: () => {
              const receipt = store.receiptFor(invoice.id);
              if (receipt) {
                toast.success("Receipt ready", { description: receipt.number });
                open(receipt.id);
              }
            },
          },
        ]
      : []),
    "divider",
    {
      label: "Delete",
      destructive: true,
      onSelect: async () => {
        const confirmed = await confirmDialog({
          title: `Delete this ${invoice.kind}?`,
          message: "Copies you already sent stay verifiable; only this device forgets it.",
          confirmLabel: "Delete",
          destructive: true,
        });
        if (!confirmed) return;
        store.remove(invoice.id);
        toast(`${invoice.number} deleted`);
      },
    },
  ]);

  return (
    <Link
      to="/invoices/$invoiceId"
      params={{ invoiceId: invoice.id }}
      {...menu}
      className={cn(
        "relative isolate flex touch-manipulation items-center gap-3 rounded-xl px-2.5 py-2.5 no-underline transition-colors [-webkit-touch-callout:none]",
        !active && "hover:bg-fill/60",
      )}
    >
      <PaperThumbnail invoice={invoice} />
      <span className="flex min-w-0 grow flex-col gap-1">
        {active && (
          <motion.span
            layoutId="invoice-selection"
            className="absolute inset-0 -z-10 rounded-xl bg-accent-soft"
            transition={spring.snappy}
          />
        )}
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-subheadline font-semibold text-label">
            {invoice.client.name || "No client yet"}
          </span>
          <span className="shrink-0 text-[14px] font-semibold tabular-nums text-label">
            {formatMoney(total, invoice.currency)}
          </span>
        </span>
        <span className="flex items-center gap-2 text-footnote text-label-secondary">
          <Chip tone={invoice.kind === "receipt" ? "public" : active ? "accent" : "neutral"}>
            {invoiceKindLabels[invoice.kind]}
          </Chip>
          <span className="truncate">{invoice.number}</span>
          {invoice.kind === "invoice" && invoice.dueOn && (
            <span className="ml-auto shrink-0 text-label-tertiary">
              Due {dueFormat.format(new Date(`${invoice.dueOn}T00:00:00Z`))}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

const THUMB_WIDTH = 46;

/** A tiny page, so documents are recognisable at a glance. */
function PaperThumbnail({ invoice }: { invoice: InvoiceDocument }) {
  const scale = THUMB_WIDTH / PAPER_WIDTH;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none relative block shrink-0 overflow-hidden rounded-xs bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_6px_14px_-6px_rgba(60,40,0,0.3)] ring-1 ring-black/5"
      style={{ width: THUMB_WIDTH, height: PAPER_HEIGHT * scale }}
    >
      <span
        className="absolute top-0 left-0 block"
        style={{ width: PAPER_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        <InvoicePaper invoice={invoice} verifyLink={null} issuerId={null} />
      </span>
    </span>
  );
}
