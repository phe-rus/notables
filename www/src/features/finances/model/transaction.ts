export interface FinanceTransaction {
  id: string;
  direction: "income" | "expense";
  date: string;
  description: string;
  currency: string;
  /** Integer minor units, matching the invoice engine. */
  amount: number;
  reference: string;
  source: "manual" | "receipt" | "sms";
  sourceText: string;
  attachments: string[];
  createdAt: number;
  updatedAt: number;
}
