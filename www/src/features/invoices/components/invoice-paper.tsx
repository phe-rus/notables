import {
  computeTotals,
  formatMoney,
  type InvoiceDocument,
  invoiceKindLabels,
  lineAmount,
} from "@notables/core";
import { useMediaSource } from "@notables/editor";
import { cn } from "@notables/ui";
import type { CSSProperties, ReactNode } from "react";
import { SealCode } from "./seal-code";

/** A4 at 96 dpi: the paper is laid out at this size and scaled to fit. */
export const PAPER_WIDTH = 794;
export const PAPER_HEIGHT = 1123;

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(date: string | null): string {
  if (!date) return "";
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(value.getTime()) ? date : dateFormat.format(value);
}

export interface InvoicePaperProps {
  invoice: InvoiceDocument;
  /** The verification link encoded in the QR code. */
  verifyLink: string | null;
  issuerId: string | null;
  className?: string;
}

/**
 * The document as printed: always light, laid out on A4. Three looks —
 * modern, classic and minimal — share one structure; the accent colors
 * headings, rules and the total.
 */
export function InvoicePaper({ invoice, verifyLink, issuerId, className }: InvoicePaperProps) {
  const totals = computeTotals(invoice);
  const money = (minor: number) => formatMoney(minor, invoice.currency);
  const { layout, font, accent, logo } = invoice.style;
  const label = invoiceKindLabels[invoice.kind];
  const amountLine =
    invoice.kind === "receipt"
      ? `${money(totals.total)} paid on ${formatDate(invoice.issuedOn)}`
      : invoice.kind === "quote"
        ? `${money(totals.total)} estimated`
        : `${money(totals.total)} due ${invoice.dueOn ? formatDate(invoice.dueOn) : "on receipt"}`;

  return (
    <article
      className={cn(
        // Sized by class, not inline, so the print stylesheet can resize it.
        "invoice-paper relative flex min-h-[1123px] w-[794px] flex-col bg-white text-[#1f1d1a] antialiased",
        font === "serif" ? "font-serif" : "font-sans",
        className,
      )}
      style={
        {
          "--inv-accent": accent,
          padding: layout === "minimal" ? "72px 76px 56px" : "64px 68px 52px",
        } as CSSProperties
      }
    >
      {layout === "classic" && (
        <div className="absolute inset-x-0 top-0 h-2.5" style={{ background: accent }} />
      )}

      <header
        className={cn(
          "flex items-start justify-between gap-8",
          layout === "classic" && "border-b-2 pb-7",
        )}
        style={layout === "classic" ? { borderColor: accent } : undefined}
      >
        <div className="flex flex-col gap-1">
          <h1
            className={cn(
              "leading-none tracking-tight",
              layout === "minimal" ? "text-[30px] font-medium" : "text-[38px] font-semibold",
            )}
            style={
              layout === "minimal"
                ? undefined
                : { color: layout === "classic" ? accent : undefined }
            }
          >
            {label}
          </h1>
          <span className="mt-1 text-[13px] text-[#77716a]">{invoice.number || "—"}</span>
        </div>
        {logo ? (
          <Logo src={logo} />
        ) : (
          invoice.issuer.name && (
            <span className="text-right text-[18px] font-semibold tracking-tight">
              {invoice.issuer.name}
            </span>
          )
        )}
      </header>

      <dl className="mt-8 grid w-max grid-cols-[auto_auto] gap-x-8 gap-y-1 text-[13px]">
        <Meta label={invoice.kind === "receipt" ? "Receipt number" : `${label} number`}>
          {invoice.number}
        </Meta>
        <Meta label={invoice.kind === "receipt" ? "Date paid" : "Date of issue"}>
          {formatDate(invoice.issuedOn)}
        </Meta>
        {invoice.kind === "invoice" && invoice.dueOn && (
          <Meta label="Date due">{formatDate(invoice.dueOn)}</Meta>
        )}
        {invoice.kind === "quote" && invoice.dueOn && (
          <Meta label="Valid until">{formatDate(invoice.dueOn)}</Meta>
        )}
      </dl>

      <section className="mt-9 grid grid-cols-2 gap-10 text-[13px] leading-[1.55]">
        <Party title="From" party={invoice.issuer} />
        <Party
          title={invoice.kind === "receipt" ? "Received from" : "Bill to"}
          party={invoice.client}
        />
      </section>

      <p
        className={cn(
          "mt-10 font-semibold tracking-tight",
          layout === "minimal" ? "text-[20px]" : "text-[24px]",
        )}
      >
        {amountLine}
      </p>

      <table className="mt-7 w-full border-collapse text-[13px]">
        <thead>
          <tr
            className="border-b text-left text-[12px] text-[#77716a]"
            style={{ borderColor: layout === "minimal" ? "#e8e4dc" : accent }}
          >
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="w-[60px] py-2 pr-4 text-right font-medium">Qty</th>
            <th className="w-[120px] py-2 pr-4 text-right font-medium">Unit price</th>
            <th className="w-[130px] py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-[#efebe4] align-top">
              <td className="py-3 pr-4 whitespace-pre-wrap">{item.description || "—"}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{item.quantity}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{money(item.unitPrice)}</td>
              <td className="py-3 text-right tabular-nums">{money(lineAmount(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 ml-auto flex w-[300px] flex-col text-[13px]">
        <TotalRow label="Subtotal" value={money(totals.subtotal)} />
        {totals.discount > 0 && <TotalRow label="Discount" value={`−${money(totals.discount)}`} />}
        {invoice.taxRate > 0 && (
          <TotalRow label={`Tax (${invoice.taxRate}%)`} value={money(totals.tax)} />
        )}
        <div
          className="mt-2 flex items-baseline justify-between border-t pt-3 text-[15px] font-semibold"
          style={{ borderColor: accent }}
        >
          <span>
            {invoice.kind === "receipt"
              ? "Amount paid"
              : invoice.kind === "quote"
                ? "Total"
                : "Amount due"}
          </span>
          <span
            className="tabular-nums"
            style={{ color: layout === "minimal" ? undefined : accent }}
          >
            {money(totals.total)}
          </span>
        </div>
      </div>

      {(invoice.paymentDetails || invoice.notes) && (
        <section className="mt-10 grid grid-cols-2 gap-10 text-[13px] leading-[1.55]">
          {invoice.paymentDetails ? (
            <div>
              <h2 className="mb-1 text-[12px] font-medium text-[#77716a]">
                {invoice.kind === "receipt" ? "Paid with" : "How to pay"}
              </h2>
              <p className="whitespace-pre-wrap">{invoice.paymentDetails}</p>
            </div>
          ) : (
            <div />
          )}
          {invoice.notes && (
            <div>
              <h2 className="mb-1 text-[12px] font-medium text-[#77716a]">Notes</h2>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-auto flex items-end justify-between gap-6 border-t border-[#efebe4] pt-6">
        <div className="flex flex-col gap-1 text-[11px] leading-snug text-[#77716a]">
          <span className="text-[12px] font-semibold text-[#1f1d1a]">
            Scan to check this {label.toLowerCase()} is genuine
          </span>
          <span>
            Signed by {invoice.issuer.name || "the issuer"} · Issuer ID{" "}
            <span className="font-mono text-[#1f1d1a]">{issuerId ?? "…"}</span>
          </span>
          <span>Any change to this document breaks the seal.</span>
        </div>
        {verifyLink ? (
          <SealCode value={verifyLink} size={108} />
        ) : (
          <div className="size-[108px] rounded-md bg-[#f3f0ea]" />
        )}
      </footer>
      {/* Microprint: the seal itself, too small to notice, but copyable from a PDF. */}
      {verifyLink && (
        <p
          aria-hidden="true"
          className="mt-3 break-all font-mono text-[3.5px] leading-[1.2] text-[#e4dfd6] select-all"
        >
          {verifyLink}
        </p>
      )}
    </article>
  );
}

function Logo({ src }: { src: string }) {
  const resolved = useMediaSource(src);
  return resolved ? (
    <img src={resolved} alt="" className="max-h-[64px] max-w-[180px] object-contain" />
  ) : null;
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[#77716a]">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </>
  );
}

function Party({ title, party }: { title: string; party: InvoiceDocument["issuer"] }) {
  const lines = [party.address, party.email, party.phone, party.taxId && `Tax ID ${party.taxId}`]
    .flatMap((line) => (line ? line.split("\n") : []))
    .filter(Boolean);
  return (
    <div>
      <h2 className="mb-1 text-[12px] font-medium text-[#77716a]">{title}</h2>
      <p className="font-semibold">{party.name || "—"}</p>
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[#77716a]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
