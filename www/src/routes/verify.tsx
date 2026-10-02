import { createFileRoute } from "@tanstack/react-router";
import { VerifyScreen } from "../features/invoices/verify/verify-screen";

export const Route = createFileRoute("/verify")({
  // The seal lives in the URL fragment, which only the browser can read.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Check a document · Notables" },
      { name: "description", content: "Check that an invoice, receipt or quote is genuine." },
    ],
  }),
  component: VerifyScreen,
});
