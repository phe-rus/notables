import { Button, CloseIcon, IconButton, Picker, Sheet, toast } from "@ultrapeach/ui";
import { useState } from "react";
import { Field, FormSection, TextArea, TextInput } from "../../../components/form/form-fields";
import { PartyFields } from "../components/party-fields";
import { StylePanel } from "../components/style-panel";
import {
  type BusinessProfile,
  draftBusinessProfile,
  saveBusinessProfile,
} from "../lib/business-profile";
import { currencyOptions } from "../lib/currencies";

/**
 * Your business, set once: name, contact details, logo, currency, tax,
 * how to pay and the notes every new document starts with.
 */
export function BusinessSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="Your business">
      <BusinessForm onClose={onClose} />
    </Sheet>
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
          <h2 className="text-title3 font-bold tracking-tight">Your business</h2>
          <p className="text-footnote leading-snug text-label-secondary">
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
              <Picker
                label="Currency"
                value={profile.currency}
                onChange={(currency) => set({ currency })}
                options={currencyOptions(profile.currency)}
              />
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
