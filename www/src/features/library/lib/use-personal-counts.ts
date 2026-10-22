import { useBooks } from "@/features/books/store/book-store";
import { usePeople } from "@/features/connections/lib/use-people";
import { useTransactions } from "@/features/finances/store/finance-store";
import { inBrowserSession } from "@/platform/session/browser-session-store";
import type { PersonalDestination } from "../model/workspace-types";

/** Workspace summaries subscribe to local state without starting browser discovery polling. */
export function usePersonalCounts(): Partial<Record<PersonalDestination, number>> {
  const books = useBooks();
  const transactions = useTransactions();
  const people = usePeople(false);
  return {
    "/books": books.length,
    "/invoices": transactions.length,
    "/connections": inBrowserSession() ? undefined : people.length,
  };
}
