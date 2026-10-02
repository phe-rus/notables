import {
  createId,
  emptyParty,
  type InvoiceDocument,
  type InvoiceKind,
  type LineItem,
} from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { getLibrary } from "../../library/store/library-store";
import { addDays, nextDocumentNumber, today } from "../lib/document-number";
import { getIssuerDefaults, rememberIssuerDefaults } from "../lib/issuer-profile";

/**
 * Invoices, receipts and quotes live in the library document beside notes
 * and books, so they sync and back up together.
 */
class InvoiceStore {
  readonly invoices: Y.Map<InvoiceDocument>;
  #snapshot: InvoiceDocument[] = [];
  #listeners = new Set<() => void>();

  constructor(doc: Y.Doc) {
    this.invoices = doc.getMap<InvoiceDocument>("invoices");
    this.invoices.observe(() => this.#refresh());
    this.#refresh();
  }

  #refresh() {
    this.#snapshot = [...this.invoices.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const listener of this.#listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  create(kind: InvoiceKind = "invoice"): InvoiceDocument {
    const now = Date.now();
    const defaults = getIssuerDefaults();
    const issuedOn = today();
    const invoice: InvoiceDocument = {
      id: createId(now),
      kind,
      number: nextDocumentNumber(
        kind,
        this.#snapshot.map((existing) => existing.number),
      ),
      currency: defaults.currency,
      issuedOn,
      dueOn: kind === "invoice" ? addDays(issuedOn, 14) : null,
      issuer: { ...defaults.issuer },
      client: emptyParty(),
      items: [newLineItem()],
      taxRate: defaults.taxRate,
      discount: 0,
      notes: kind === "receipt" ? "Paid in full. Thank you!" : "Thank you for your business.",
      paymentDetails: defaults.paymentDetails,
      style: { ...defaults.style },
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  update(id: string, patch: Partial<Omit<InvoiceDocument, "id" | "createdAt">>) {
    const current = this.invoices.get(id);
    if (!current) return;
    const next = { ...current, ...patch, updatedAt: Date.now() };
    this.invoices.set(id, next);
    // The next document starts from the details used most recently.
    rememberIssuerDefaults({
      issuer: next.issuer,
      currency: next.currency,
      taxRate: next.taxRate,
      paymentDetails: next.paymentDetails,
      style: next.style,
    });
  }

  /** A fresh copy with a new number and today's dates. */
  duplicate(id: string): InvoiceDocument | undefined {
    const source = this.invoices.get(id);
    if (!source) return undefined;
    const fresh = this.create(source.kind);
    const copy: InvoiceDocument = {
      ...source,
      id: fresh.id,
      number: fresh.number,
      issuedOn: fresh.issuedOn,
      dueOn: fresh.dueOn,
      items: source.items.map((item) => ({ ...item, id: createId() })),
      createdAt: fresh.createdAt,
      updatedAt: fresh.updatedAt,
    };
    this.invoices.set(copy.id, copy);
    return copy;
  }

  /** A receipt for a paid invoice: same parties and items, dated today. */
  receiptFor(id: string): InvoiceDocument | undefined {
    const source = this.invoices.get(id);
    if (!source) return undefined;
    const fresh = this.create("receipt");
    const receipt: InvoiceDocument = {
      ...source,
      id: fresh.id,
      kind: "receipt",
      number: fresh.number,
      issuedOn: fresh.issuedOn,
      dueOn: null,
      items: source.items.map((item) => ({ ...item, id: createId() })),
      notes: source.number ? `Payment for ${source.number}. Thank you!` : fresh.notes,
      createdAt: fresh.createdAt,
      updatedAt: fresh.updatedAt,
    };
    this.invoices.set(receipt.id, receipt);
    return receipt;
  }

  remove(id: string) {
    this.invoices.delete(id);
  }
}

export function newLineItem(): LineItem {
  return { id: createId(), description: "", quantity: 1, unitPrice: 0 };
}

let instance: InvoiceStore | undefined;

export function getInvoiceStore(): InvoiceStore {
  instance ??= new InvoiceStore(getLibrary().doc);
  return instance;
}

const EMPTY: InvoiceDocument[] = [];

export function useInvoices(): InvoiceDocument[] {
  const store = getInvoiceStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}

export function useInvoice(id: string): InvoiceDocument | undefined {
  return useInvoices().find((invoice) => invoice.id === id);
}
