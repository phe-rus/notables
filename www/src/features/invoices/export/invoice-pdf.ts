import {
  computeTotals,
  formatMoney,
  type InvoiceDocument,
  invoiceKindLabels,
  lineAmount,
} from "@notables/core";
import {
  PDFDict,
  PDFDocument,
  type PDFFont,
  type PDFImage,
  PDFName,
  type PDFPage,
  PDFString,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { encode } from "uqr";

/**
 * The invoice as a real PDF: vector text that stays sharp and selectable,
 * the QR seal drawn as shapes, the seal microprinted in the footer, and the
 * seal stored in the file's metadata so Notables can verify the file itself.
 * Mirrors the on-screen paper (components/invoice-paper.tsx).
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 50;
const INK = rgb(0.12, 0.11, 0.1);
const MUTED = rgb(0.47, 0.44, 0.42);
const RULE = rgb(0.94, 0.92, 0.89);
const MICRO = rgb(0.89, 0.87, 0.84);

/** The metadata key carrying the seal; read back by the verify page. */
export const PDF_SEAL_KEY = "NotablesSeal";

export interface InvoicePdfInput {
  invoice: InvoiceDocument;
  verifyLink: string;
  issuerId: string;
  seal: string;
  /** PNG or JPEG bytes of the logo, if any. */
  logo?: { bytes: Uint8Array; type: string } | null;
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value.padEnd(6, "0");
  const n = Number.parseInt(full.slice(0, 6), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const formatDate = (date: string | null) =>
  date ? dateFormat.format(new Date(`${date}T00:00:00Z`)) : "";

/** Standard PDF fonts cover Latin text; swap anything else for a close stand-in. */
function encoder(font: PDFFont) {
  const cache = new Map<string, string>();
  const replacements: Record<string, string> = { "−": "-", " ": " ", " ": " " };
  return (text: string) =>
    Array.from(text, (char) => {
      const known = cache.get(char);
      if (known !== undefined) return known;
      let safe = replacements[char] ?? char;
      try {
        font.encodeText(safe);
      } catch {
        const bare = safe.normalize("NFKD").replace(/\p{Diacritic}/gu, "");
        try {
          font.encodeText(bare);
          safe = bare;
        } catch {
          safe = "?";
        }
      }
      cache.set(char, safe);
      return safe;
    }).join("");
}

/** Word-wraps text to a width, keeping explicit line breaks. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const { invoice, verifyLink, issuerId, seal } = input;
  const pdf = await PDFDocument.create();
  const serif = invoice.style.font === "serif";
  const regular = await pdf.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await pdf.embedFont(
    serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold,
  );
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const safe = encoder(regular);
  const accent = hexToRgb(invoice.style.accent);
  const layout = invoice.style.layout;
  const label = invoiceKindLabels[invoice.kind];
  const totals = computeTotals(invoice);
  const money = (minor: number) => safe(formatMoney(minor, invoice.currency));
  let logo: PDFImage | null = null;
  if (input.logo) {
    try {
      logo = input.logo.type.includes("png")
        ? await pdf.embedPng(input.logo.bytes)
        : await pdf.embedJpg(input.logo.bytes);
    } catch {
      logo = null;
    }
  }

  let page: PDFPage = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;
  const right = A4.width - MARGIN;
  const contentWidth = right - MARGIN;

  const text = (
    value: string,
    x: number,
    size: number,
    options: { font?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "right" } = {},
  ) => {
    const font = options.font ?? regular;
    const content = safe(value);
    const width = font.widthOfTextAtSize(content, size);
    page.drawText(content, {
      x: options.align === "right" ? x - width : x,
      y,
      size,
      font,
      color: options.color ?? INK,
    });
  };
  const rule = (yAt: number, color = RULE, thickness = 0.6, from = MARGIN, to = right) =>
    page.drawLine({ start: { x: from, y: yAt }, end: { x: to, y: yAt }, thickness, color });
  const newPage = () => {
    page = pdf.addPage([A4.width, A4.height]);
    y = A4.height - MARGIN;
  };
  const ensure = (space: number) => {
    if (y - space < MARGIN + 150) newPage();
  };

  // Header
  if (layout === "classic") {
    page.drawRectangle({ x: 0, y: A4.height - 7, width: A4.width, height: 7, color: accent });
  }
  y -= 22;
  text(label, MARGIN, layout === "minimal" ? 24 : 30, {
    font: layout === "minimal" ? regular : bold,
    color: layout === "classic" ? accent : INK,
  });
  if (logo) {
    const scale = Math.min(140 / logo.width, 46 / logo.height, 1);
    page.drawImage(logo, {
      x: right - logo.width * scale,
      y: y - 6,
      width: logo.width * scale,
      height: logo.height * scale,
    });
  } else if (invoice.issuer.name) {
    text(invoice.issuer.name, right, 13, { font: bold, align: "right" });
  }
  y -= 18;
  text(invoice.number || "", MARGIN, 9, { color: MUTED });
  if (layout === "classic") {
    y -= 16;
    rule(y, accent, 1.4);
  }

  // Document details
  y -= 30;
  const meta: Array<[string, string]> = [
    [invoice.kind === "receipt" ? "Receipt number" : `${label} number`, invoice.number],
    [invoice.kind === "receipt" ? "Date paid" : "Date of issue", formatDate(invoice.issuedOn)],
  ];
  if (invoice.kind !== "receipt" && invoice.dueOn) {
    meta.push([invoice.kind === "quote" ? "Valid until" : "Date due", formatDate(invoice.dueOn)]);
  }
  for (const [name, value] of meta) {
    text(name, MARGIN, 9.5, { color: MUTED });
    text(value, MARGIN + 100, 9.5, { font: bold });
    y -= 15;
  }

  // Parties
  y -= 16;
  const columnX = MARGIN + contentWidth / 2 + 10;
  const partyLines = (party: InvoiceDocument["issuer"]) =>
    [party.address, party.email, party.phone, party.taxId && `Tax ID ${party.taxId}`]
      .flatMap((line) => (line ? line.split("\n") : []))
      .filter(Boolean);
  const top = y;
  const drawParty = (title: string, party: InvoiceDocument["issuer"], x: number) => {
    y = top;
    text(title, x, 9, { color: MUTED });
    y -= 14;
    text(party.name || "-", x, 10, { font: bold });
    for (const line of partyLines(party)) {
      y -= 13;
      text(line, x, 9.5);
    }
    return y;
  };
  const leftEnd = drawParty("From", invoice.issuer, MARGIN);
  const rightEnd = drawParty(
    invoice.kind === "receipt" ? "Received from" : "Bill to",
    invoice.client,
    columnX,
  );
  y = Math.min(leftEnd, rightEnd) - 34;

  // Amount line
  const amountLine =
    invoice.kind === "receipt"
      ? `${money(totals.total)} paid on ${formatDate(invoice.issuedOn)}`
      : invoice.kind === "quote"
        ? `${money(totals.total)} estimated`
        : `${money(totals.total)} due ${invoice.dueOn ? formatDate(invoice.dueOn) : "on receipt"}`;
  text(amountLine, MARGIN, layout === "minimal" ? 15 : 18, { font: bold });

  // Items
  const columns = { qty: right - 220, unit: right - 120, amount: right };
  const descriptionWidth = columns.qty - 50 - MARGIN;
  y -= 34;
  text("Description", MARGIN, 9, { color: MUTED });
  text("Qty", columns.qty, 9, { color: MUTED, align: "right" });
  text("Unit price", columns.unit, 9, { color: MUTED, align: "right" });
  text("Amount", columns.amount, 9, { color: MUTED, align: "right" });
  y -= 8;
  rule(y, layout === "minimal" ? RULE : accent, 1);
  for (const item of invoice.items) {
    const lines = wrap(safe(item.description || "-"), regular, 9.5, descriptionWidth);
    ensure(lines.length * 13 + 20);
    y -= 17;
    text(String(item.quantity), columns.qty, 9.5, { align: "right" });
    text(money(item.unitPrice), columns.unit, 9.5, { align: "right" });
    text(money(lineAmount(item)), columns.amount, 9.5, { align: "right" });
    lines.forEach((line, index) => {
      if (index > 0) y -= 13;
      text(line, MARGIN, 9.5);
    });
    y -= 9;
    rule(y);
  }

  // Totals
  ensure(110);
  const totalsX = right - 200;
  const row = (name: string, value: string) => {
    y -= 16;
    text(name, totalsX, 9.5, { color: MUTED });
    text(value, right, 9.5, { align: "right" });
  };
  y -= 6;
  row("Subtotal", money(totals.subtotal));
  if (totals.discount > 0) row("Discount", `-${money(totals.discount)}`);
  if (invoice.taxRate > 0) row(`Tax (${invoice.taxRate}%)`, money(totals.tax));
  y -= 12;
  rule(y, accent, 1, totalsX, right);
  y -= 17;
  text(
    invoice.kind === "receipt" ? "Amount paid" : invoice.kind === "quote" ? "Total" : "Amount due",
    totalsX,
    11,
    { font: bold },
  );
  text(money(totals.total), right, 11, {
    font: bold,
    color: layout === "minimal" ? INK : accent,
    align: "right",
  });

  // Payment and notes
  if (invoice.paymentDetails || invoice.notes) {
    ensure(80);
    y -= 38;
    const sectionTop = y;
    const block = (title: string, body: string, x: number) => {
      y = sectionTop;
      text(title, x, 9, { color: MUTED });
      for (const line of wrap(safe(body), regular, 9.5, contentWidth / 2 - 20)) {
        y -= 13;
        text(line, x, 9.5);
      }
      return y;
    };
    const ends = [
      invoice.paymentDetails
        ? block(
            invoice.kind === "receipt" ? "Paid with" : "How to pay",
            invoice.paymentDetails,
            MARGIN,
          )
        : sectionTop,
      invoice.notes ? block("Notes", invoice.notes, columnX) : sectionTop,
    ];
    y = Math.min(...ends);
  }

  // Footer with the seal, always at the bottom of the last page.
  const qrSize = 80;
  const footerTop = MARGIN + qrSize + 18;
  if (y < footerTop + 20) newPage();
  y = footerTop;
  rule(y + 10);
  y -= 30;
  text(`Scan to check this ${label.toLowerCase()} is genuine`, MARGIN, 9.5, { font: bold });
  y -= 14;
  text(`Signed by ${invoice.issuer.name || "the issuer"} - Issuer ID `, MARGIN, 8.5, {
    color: MUTED,
  });
  const prefixWidth = regular.widthOfTextAtSize(
    safe(`Signed by ${invoice.issuer.name || "the issuer"} - Issuer ID `),
    8.5,
  );
  page.drawText(issuerId, { x: MARGIN + prefixWidth, y, size: 8.5, font: mono, color: INK });
  y -= 13;
  text("Any change to this document breaks the seal.", MARGIN, 8.5, { color: MUTED });

  const { data, size } = encode(verifyLink, { ecc: "M", border: 0 });
  const cell = qrSize / size;
  const qrX = right - qrSize;
  const qrY = MARGIN + 10;
  page.drawRectangle({
    x: qrX - 4,
    y: qrY - 4,
    width: qrSize + 8,
    height: qrSize + 8,
    color: rgb(1, 1, 1),
  });
  data.forEach((rowCells, rowIndex) => {
    rowCells.forEach((dark, column) => {
      if (!dark) return;
      page.drawRectangle({
        x: qrX + column * cell,
        y: qrY + qrSize - (rowIndex + 1) * cell,
        width: cell + 0.05,
        height: cell + 0.05,
        color: INK,
      });
    });
  });

  // Microprint: the full link along the bottom edge, copyable from the PDF.
  const perLine = Math.floor(contentWidth / mono.widthOfTextAtSize("0", 3));
  for (
    let start = 0, microY = MARGIN - 8;
    start < verifyLink.length;
    start += perLine, microY -= 4
  ) {
    page.drawText(verifyLink.slice(start, start + perLine), {
      x: MARGIN,
      y: microY,
      size: 3,
      font: mono,
      color: MICRO,
    });
  }

  pdf.setTitle(`${label} ${invoice.number}`.trim());
  pdf.setAuthor(invoice.issuer.name || "Notables");
  pdf.setSubject(
    `Signed with Notables. Issuer ID ${issuerId}. Verify at ${verifyLink.split("#")[0]}`,
  );
  pdf.setCreator("Notables");
  pdf.setProducer("Notables");
  pdf.setCreationDate(new Date(invoice.createdAt));
  pdf.setModificationDate(new Date());
  // The info dictionary exists once a title is set; add the seal beside it.
  const info = pdf.context.lookup(pdf.context.trailerInfo.Info, PDFDict);
  info.set(PDFName.of(PDF_SEAL_KEY), PDFString.of(seal));
  // Object streams would compress the metadata; keep it plain so it can be read back simply.
  return pdf.save({ useObjectStreams: false });
}

/** Finds the seal stored in a Notables PDF, without parsing the whole file. */
export function sealFromPdf(bytes: Uint8Array): string | null {
  const text = new TextDecoder("latin1").decode(bytes);
  const match = new RegExp(`/${PDF_SEAL_KEY}\\s*\\(([A-Za-z0-9_\\-.]+)\\)`).exec(text);
  return match?.[1] ?? null;
}
