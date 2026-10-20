import { createId } from "@notables/core";
import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { sameImportedTransaction } from "@/features/finances/lib/mobile-money";
import type { FinanceTransaction } from "@/features/finances/model/types";
import { getLibrary } from "@/features/library/store/library-store";

export class FinanceStore {
  readonly transactions: Y.Map<FinanceTransaction>;
  #snapshot: FinanceTransaction[] = [];
  #listeners = new Set<() => void>();
  constructor(doc: Y.Doc) {
    this.transactions = doc.getMap("finance-transactions");
    this.transactions.observe(() => this.#refresh());
    this.#refresh();
  }
  #refresh() {
    this.#snapshot = [...this.transactions.values()].sort((a, b) => b.date.localeCompare(a.date));
    for (const listener of this.#listeners) listener();
  }
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  getSnapshot = () => this.#snapshot;
  remove(id: string) {
    this.transactions.delete(id);
  }
  save(
    draft: Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ): FinanceTransaction {
    if (
      !Number.isSafeInteger(draft.amount) ||
      draft.amount <= 0 ||
      (draft.fee !== undefined && (!Number.isSafeInteger(draft.fee) || draft.fee < 0)) ||
      !/^[A-Z]{3}$/.test(draft.currency) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
      !draft.description.trim() ||
      (draft.source === "sms" && !draft.sourceText.trim()) ||
      !Number.isFinite(Date.parse(`${draft.date}T00:00:00Z`)) ||
      new Date(`${draft.date}T00:00:00Z`).toISOString().slice(0, 10) !== draft.date
    )
      throw new Error("invalid-transaction");
    const duplicate =
      !id &&
      draft.source === "sms" &&
      this.#snapshot.find((item) => sameImportedTransaction(item, draft));
    if (duplicate) throw new Error("duplicate-transaction");
    const now = Date.now();
    const current = id ? this.transactions.get(id) : undefined;
    const value = {
      ...draft,
      description: draft.description.trim(),
      id: current?.id ?? createId(now),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    this.transactions.set(value.id, value);
    return value;
  }
}
let instance: FinanceStore | undefined;
export const getFinanceStore = () => (instance ??= new FinanceStore(getLibrary().doc));
const EMPTY: FinanceTransaction[] = [];
export function useTransactions() {
  const store = getFinanceStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}
