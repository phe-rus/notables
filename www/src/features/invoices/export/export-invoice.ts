import { type InvoiceDocument, invoiceKindLabels, localMediaId } from "@notables/core";
import { fileNameFor, type SaveOutcome, saveFile } from "../../../platform/save-file";
import { loadMedia } from "../../../platform/storage/media-store";
import { buildInvoicePdf } from "./invoice-pdf";

/** Logos embed in PDFs as PNG or JPEG; other formats are left out. */
async function logoFor(invoice: InvoiceDocument) {
  const id = invoice.style.logo ? localMediaId(invoice.style.logo) : null;
  const file = id ? await loadMedia(id).catch(() => null) : null;
  if (!file || !/image\/(png|jpe?g)/.test(file.type)) return null;
  return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type };
}

/** Builds the signed PDF and saves it the way this device expects. */
export async function exportInvoicePdf(
  invoice: InvoiceDocument,
  verifyLink: string,
  issuerId: string,
): Promise<SaveOutcome> {
  const seal = verifyLink.slice(verifyLink.indexOf("#") + 1);
  const pdf = await buildInvoicePdf({
    invoice,
    verifyLink,
    issuerId,
    seal,
    logo: await logoFor(invoice),
  });
  const name = `${invoiceKindLabels[invoice.kind]} ${invoice.number} ${invoice.client.name}`;
  return saveFile(pdf, fileNameFor(name, "pdf"), "application/pdf");
}
