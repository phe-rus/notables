import { emptyParty } from "@notables/core";
import { useSyncExternalStore } from "react";
import { fallbackDefaults, getIssuerDefaults, type IssuerDefaults } from "./issuer-profile";

/**
 * The business behind the invoices: saved once, on purpose, and used to
 * start every new invoice, receipt and quote. Editing one document never
 * changes it. Without one, new documents start from the last one made.
 */
export interface BusinessProfile extends IssuerDefaults {
  /** Notes printed on new invoices and quotes. */
  invoiceNotes: string;
  /** Notes printed on new receipts. */
  receiptNotes: string;
  /** Days from issue until an invoice is due. */
  dueDays: number;
}

const STORAGE_KEY = "notables:business-profile";
const listeners = new Set<() => void>();
let cached: BusinessProfile | null | undefined;

function read(): BusinessProfile | null {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<BusinessProfile> | null;
    if (!stored) return null;
    return {
      ...fallbackDefaults,
      invoiceNotes: "Thank you for your business.",
      receiptNotes: "Paid in full. Thank you!",
      dueDays: 14,
      ...stored,
      issuer: { ...emptyParty(), ...stored.issuer },
      style: { ...fallbackDefaults.style, ...stored.style },
    };
  } catch {
    return null;
  }
}

export function getBusinessProfile(): BusinessProfile | null {
  if (cached === undefined) cached = typeof localStorage === "undefined" ? null : read();
  return cached;
}

export function saveBusinessProfile(profile: BusinessProfile) {
  cached = profile;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Kept for this session only.
  }
  for (const listener of listeners) listener();
}

/** A profile to start editing from: the saved one, or what documents use today. */
export function draftBusinessProfile(): BusinessProfile {
  return (
    getBusinessProfile() ?? {
      ...getIssuerDefaults(),
      invoiceNotes: "Thank you for your business.",
      receiptNotes: "Paid in full. Thank you!",
      dueDays: 14,
    }
  );
}

export function useBusinessProfile(): BusinessProfile | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getBusinessProfile,
    () => null,
  );
}
