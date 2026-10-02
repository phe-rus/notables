import type { InvoiceDocument, InvoiceParty } from "@notables/core";

/**
 * Everyone billed before, newest first, one entry per name. The latest
 * document wins, so changed details (a new address) come along.
 */
export function recentClients(documents: InvoiceDocument[], limit = 8): InvoiceParty[] {
  const seen = new Map<string, InvoiceParty>();
  const newest = [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const document of newest) {
    const key = document.client.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.set(key, document.client);
    if (seen.size === limit) break;
  }
  return [...seen.values()];
}
