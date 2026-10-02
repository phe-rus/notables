import { Button, CloseIcon, IconButton, spring, toast } from "@notables/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Field, FormSection, TextArea, TextInput } from "../components/form-fields";
import { PartyFields } from "../components/party-fields";
import { StylePanel } from "../components/style-panel";
import {
  type BusinessProfile,
  draftBusinessProfile,
  saveBusinessProfile,
} from "../lib/business-profile";
import { currencies } from "../lib/currencies";

/**
 * Your business, set once: name, contact details, logo, currency, tax,
 * how to pay and the notes every new document starts with.
 */
export function BusinessSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Your business"
            className="glass-menu relative flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={spring.smooth}
          >
            <BusinessForm onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function BusinessForm({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<BusinessProfile>(draftBusinessProfile);
  const set = (change: Partial<BusinessProfile>) => setProfile((p) => ({ ...p, ...change }));

  const save = () => {
    saveBusinessProfile({
      ...profile,
      issuer: { ...profile.issuer, name: profile.issuer.name.trim() },
    });
    toast.success("Business details saved", {
      description: "New invoices, receipts and quotes start with them.",
    });
    onClose();
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-bold tracking-tight">Your business</h2>
          <p className="text-[13px] leading-snug text-label-secondary">
            Filled in on every new document, so you never type it twice. Documents already made stay
            as they are.
          </p>
        </div>
        <IconButton label="Close" onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>

      <div className="flex grow flex-col gap-7 overflow-y-auto px-6 pt-2 pb-6">
        <FormSection title="Business">
          <PartyFields
            party={profile.issuer}
            namePlaceholder="Business or company name"
            onChange={(issuer) => set({ issuer })}
          />
        </FormSection>

        <FormSection title="Money">
          <div className="grid grid-cols-3 gap-2.5">
            <Field label="Currency">
              <select
                value={profile.currency}
                onChange={(e) => set({ currency: e.target.value })}
                className="w-full rounded-[10px] control-field px-3 py-2 text-[14px] text-label"
              >
                {[...new Set([profile.currency, ...currencies])].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tax rate (%)">
              <TextInput
                inputMode="decimal"
                value={profile.taxRate ? String(profile.taxRate) : ""}
                placeholder="0"
                onChange={(e) => {
                  const rate = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(rate) && rate >= 0 && rate <= 100) set({ taxRate: rate });
                }}
              />
            </Field>
            <Field label="Due after (days)">
              <TextInput
                inputMode="numeric"
                value={String(profile.dueDays)}
                onChange={(e) => {
                  const days = Number(e.target.value || 0);
                  if (Number.isInteger(days) && days >= 0 && days <= 365) set({ dueDays: days });
                }}
              />
            </Field>
          </div>
          <Field label="How to pay">
            <TextArea
              rows={3}
              value={profile.paymentDetails}
              placeholder="Bank account, mobile money number or payment link"
              onChange={(e) => set({ paymentDetails: e.target.value })}
            />
          </Field>
        </FormSection>

        <FormSection title="Notes">
          <Field label="On invoices and quotes">
            <TextArea
              value={profile.invoiceNotes}
              onChange={(e) => set({ invoiceNotes: e.target.value })}
            />
          </Field>
          <Field label="On receipts">
            <TextArea
              value={profile.receiptNotes}
              onChange={(e) => set({ receiptNotes: e.target.value })}
            />
          </Field>
        </FormSection>

        <FormSection title="Look">
          <StylePanel style={profile.style} onChange={(style) => set({ style })} />
        </FormSection>
      </div>

      <footer className="flex justify-end gap-2 border-t border-separator/60 px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={!profile.issuer.name.trim()}>
          Save
        </Button>
      </footer>
    </>
  );
}
