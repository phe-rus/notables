import { contentHash, createSeal, type InvoiceDocument, issuerIdFor } from "@notables/core";
import { useEffect, useState } from "react";
import { getSigningKey } from "../../../platform/signing-key";
import { verifyUrl } from "./verify-url";

/**
 * The seal for a document as it stands, re-signed whenever what it says
 * changes (not when only its look does), and this device's issuer ID.
 */
export function useInvoiceSeal(invoice: InvoiceDocument) {
  const [state, setState] = useState<{ link: string | null; issuerId: string | null }>({
    link: null,
    issuerId: null,
  });
  const hash = contentHash(invoice);

  // Re-sign only when the signed contents change, not when the look does.
  useEffect(() => {
    let cancelled = false;
    void getSigningKey().then((key) => {
      if (cancelled) return;
      setState({ link: verifyUrl(createSeal(invoice, key)), issuerId: issuerIdFor(key.publicKey) });
    });
    return () => {
      cancelled = true;
    };
  }, [hash]);

  return state;
}
