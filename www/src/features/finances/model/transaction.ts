export interface FinanceTransaction {
  id: string;
  direction: "income" | "expense";
  date: string;
  description: string;
  currency: string;
  /** Integer minor units, matching the invoice engine. */
  amount: number;
  reference: string;
  category?: "payment" | "borrowing" | "repayment" | "transfer";
  /** Fee in minor units, kept separate from the principal. */
  fee?: number;
  source: "manual" | "receipt" | "sms";
  sourceText: string;
  attachments: string[];
  createdAt: number;
  updatedAt: number;
}
