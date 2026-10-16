import { emptyParty } from "@notables/core";
import { useSyncExternalStore } from "react";
import { syncedSetting } from "../../../platform/settings/synced-settings";
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

const stored = syncedSetting("notables:business-profile");
let cached: BusinessProfile | null = null;
let cachedFrom: unknown;

function read(raw: unknown): BusinessProfile | null {
  const saved = raw as Partial<BusinessProfile> | undefined;
  if (!saved) return null;
  return {
    ...fallbackDefaults,
    invoiceNotes: "Thank you for your business.",
    receiptNotes: "Paid in full. Thank you!",
    dueDays: 14,
    ...saved,
    issuer: { ...emptyParty(), ...saved.issuer },
    style: { ...fallbackDefaults.style, ...saved.style },
  };
}

export function getBusinessProfile(): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  const raw = stored.get();
  if (raw !== cachedFrom) {
    cachedFrom = raw;
    cached = read(raw);
  }
  return cached;
}

export function saveBusinessProfile(profile: BusinessProfile) {
  stored.set(profile);
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
  return useSyncExternalStore(stored.subscribe, getBusinessProfile, () => null);
}
