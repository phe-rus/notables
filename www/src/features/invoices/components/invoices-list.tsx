import { computeTotals, formatMoney, type InvoiceKind, invoiceKindLabels } from "@notables/core";
import { Chip, cn, IconButton, InvoiceIcon, SidebarIcon, spring } from "@notables/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { usePreferences } from "../../settings/store/preferences-store";
import { getInvoiceStore, useInvoices } from "../store/invoice-store";

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
  const invoices = useInvoices();
  const navigate = useNavigate();
  const { collapsed } = usePreferences().sidebar;

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
            <IconButton label="Show library" className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <h1 className="text-[22px] font-bold tracking-tight">Invoices</h1>
          </div>
          <IconButton label="New invoice" tone="accent" onClick={() => create("invoice")}>
            <InvoiceIcon size={20} />
          </IconButton>
        </div>
        <div className="flex gap-2">
          {(["invoice", "receipt", "quote"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => create(kind)}
              className="grow rounded-[10px] bg-fill px-2 py-1.5 text-[13px] font-medium text-label-secondary transition-colors hover:bg-separator/70 hover:text-label"
            >
              + {invoiceKindLabels[kind]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex grow flex-col overflow-y-auto px-2.5 pb-28 md:pb-8">
        {invoices.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <p className="text-[15px] font-semibold">Get paid, beautifully</p>
            <p className="text-[14px] leading-snug text-label-secondary">
              Invoices, receipts and quotes, signed on this device so anyone can scan them to check
              they’re genuine.
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {invoices.map((invoice) => {
            const active = invoice.id === activeId;
            const total = computeTotals(invoice).total;
            return (
              <motion.div
                key={invoice.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={spring.smooth}
              >
                <Link
                  to="/invoices/$invoiceId"
                  params={{ invoiceId: invoice.id }}
                  className={cn(
                    "relative isolate flex flex-col gap-1 rounded-[12px] px-3 py-3 no-underline transition-colors",
                    !active && "hover:bg-fill/60",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="invoice-selection"
                      className="absolute inset-0 -z-10 rounded-[12px] bg-accent-soft"
                      transition={spring.snappy}
                    />
                  )}
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold text-label">
                      {invoice.client.name || "No client yet"}
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-label">
                      {formatMoney(total, invoice.currency)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[13px] text-label-secondary">
                    <Chip
                      tone={invoice.kind === "receipt" ? "public" : active ? "accent" : "neutral"}
                    >
                      {invoiceKindLabels[invoice.kind]}
                    </Chip>
                    <span className="truncate">{invoice.number}</span>
                    {invoice.kind === "invoice" && invoice.dueOn && (
                      <span className="ml-auto shrink-0 text-label-tertiary">
                        Due {dueFormat.format(new Date(`${invoice.dueOn}T00:00:00Z`))}
                      </span>
                    )}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
