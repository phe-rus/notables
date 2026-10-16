import { normalizeCode } from "@notables/sync";

/**
 * What a waiting browser's or device's QR code holds: an app link that opens
 * Notables at Linked Devices, with the code and the waiting side's own seat,
 * so a scan reaches that one browser or device and no other.
 */
export const linkUrl = (code: string, browserId: string) =>
  `notables://link?c=${normalizeCode(code)}&b=${encodeURIComponent(browserId)}`;

/** The code and browser in a scanned link, or null for anything else. */
export function readLinkUrl(text: string): { code: string; browserId: string | null } | null {
  try {
    const url = new URL(text.trim());
    if (url.protocol !== "notables:" || url.hostname !== "link") return null;
    const code = normalizeCode(url.searchParams.get("c") ?? "");
    return code ? { code, browserId: url.searchParams.get("b") } : null;
  } catch {
    return null;
  }
}
