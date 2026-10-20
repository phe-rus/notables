import type { SignalData } from "@notables/sync";

/** Discovery announcements must not keep the fast connection polling window alive. */
export function isNegotiationSignal(data: SignalData): boolean {
  return data.kind === "offer" || data.kind === "answer";
}
