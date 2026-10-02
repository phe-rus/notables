import { checkCodeFor, createSeal, normalizeCheckCode } from "@notables/core";
import { getSigningKey } from "../../../platform/signing-key";
import { getLibrary } from "../../library/store/library-store";
import { getInvoiceStore } from "../store/invoice-store";

export type NumberCheck =
  | { status: "match"; seal: string }
  | { status: "code-mismatch" }
  | { status: "not-found" };

function libraryLoaded(): Promise<void> {
  const library = getLibrary();
  if (library.ready) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = library.subscribe(() => {
      if (!library.ready) return;
      stop();
      resolve();
    });
  });
}

/**
 * Confirms a paper copy by its number and check code, against documents
 * issued from this device. A match gives back the seal, so the usual
 * result shows exactly what was signed for comparison with the paper.
 */
export async function checkByNumber(number: string, code: string): Promise<NumberCheck> {
  await libraryLoaded();
  const wanted = number.trim().toLowerCase();
  const candidates = getInvoiceStore()
    .getSnapshot()
    .filter((invoice) => invoice.number.trim().toLowerCase() === wanted);
  if (candidates.length === 0) return { status: "not-found" };
  const key = await getSigningKey();
  const typed = normalizeCheckCode(code);
  for (const invoice of candidates) {
    const seal = createSeal(invoice, key);
    if (checkCodeFor(seal) === typed) return { status: "match", seal };
  }
  return { status: "code-mismatch" };
}
