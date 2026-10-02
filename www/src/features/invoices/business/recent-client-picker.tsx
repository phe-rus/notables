import type { InvoiceDocument, InvoiceParty } from "@notables/core";
import { recentClients } from "../lib/recent-clients";
import { useInvoices } from "../store/invoice-store";

/** One tap to bill someone you have billed before. */
export function RecentClientPicker({
  invoice,
  onPick,
}: {
  invoice: InvoiceDocument;
  onPick: (client: InvoiceParty) => void;
}) {
  const others = useInvoices().filter((document) => document.id !== invoice.id);
  const current = invoice.client.name.trim().toLowerCase();
  const clients = recentClients(others).filter(
    (client) => client.name.trim().toLowerCase() !== current,
  );
  if (clients.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-label-secondary">Recent</span>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {clients.map((client) => (
          <button
            key={client.name}
            type="button"
            onClick={() => onPick({ ...client })}
            className="shrink-0 rounded-full bg-fill/70 px-3 py-1.5 text-[13px] font-medium text-label transition-colors hover:bg-fill"
          >
            {client.name}
          </button>
        ))}
      </div>
    </div>
  );
}
