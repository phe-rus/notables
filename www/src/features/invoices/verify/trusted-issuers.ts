/**
 * Issuers this device has seen, by issuer ID. Remembering them lets the
 * verify page warn when a document claims a familiar name but carries a
 * different issuer ID: the mark of a forgery.
 */
export interface KnownIssuer {
  id: string;
  name: string;
  firstSeen: number;
}

const STORAGE_KEY = "notables:known-issuers";

function read(): Record<string, KnownIssuer> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function knownIssuer(id: string): KnownIssuer | null {
  return read()[id] ?? null;
}

/** Known issuers using this name under a different ID. */
export function namesakes(name: string, id: string): KnownIssuer[] {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return [];
  return Object.values(read()).filter(
    (issuer) => issuer.id !== id && issuer.name.trim().toLowerCase() === wanted,
  );
}

export function rememberIssuer(id: string, name: string): void {
  const all = read();
  all[id] = { id, name, firstSeen: all[id]?.firstSeen ?? Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Not remembered; the check still works, just without history.
  }
}
