import { createFileRoute } from "@tanstack/react-router";
import { InvoiceScreen } from "../../../features/invoices/components/invoice-screen";
import { useInvoice } from "../../../features/invoices/store/invoice-store";
import { useLibraryReady } from "../../../features/library/store/library-store";

export const Route = createFileRoute("/_app/invoices/$invoiceId")({
  component: InvoiceRoute,
});

function InvoiceRoute() {
  const { invoiceId } = Route.useParams();
  const invoice = useInvoice(invoiceId);
  const ready = useLibraryReady();
  if (!invoice) {
    return ready ? (
      <p className="m-auto text-[15px] text-label-secondary">This document isn’t on this device.</p>
    ) : null;
  }
  return <InvoiceScreen invoice={invoice} />;
}
