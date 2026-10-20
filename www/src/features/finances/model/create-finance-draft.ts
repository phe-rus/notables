import { localDay } from "@notables/core";
import { getIssuerDefaults } from "@/features/invoices/lib/issuer-profile";
import type { FinanceDraft, FinanceTransaction } from "./types";

export const createFinanceDraft = (
  source: FinanceTransaction["source"] = "manual",
): FinanceDraft => ({
  direction: "expense",
  date: localDay(),
  description: "",
  currency: getIssuerDefaults().currency,
  amount: "",
  reference: "",
  source,
  sourceText: "",
  attachments: [],
});
