import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/invoices/")({
  component: NoInvoiceSelected,
});

function NoInvoiceSelected() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="font-serif text-[26px] font-semibold text-label">Get paid, beautifully.</p>
      <p className="max-w-[360px] text-[15px] text-label-secondary">
        Pick a document, or start an invoice, receipt or quote. Each one is signed so anyone can
        scan it to check it’s genuine.
      </p>
    </div>
  );
}
