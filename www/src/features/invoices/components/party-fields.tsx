import type { InvoiceParty } from "@notables/core";
import { Field, TextArea, TextInput } from "../../../components/form/form-fields";

/** Name, contact details and tax ID of the issuer or the client. */
export function PartyFields({
  party,
  onChange,
  namePlaceholder,
}: {
  party: InvoiceParty;
  onChange: (party: InvoiceParty) => void;
  namePlaceholder: string;
}) {
  const set = (key: keyof InvoiceParty) => (value: string) => onChange({ ...party, [key]: value });
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Field label="Name" className="col-span-2">
        <TextInput
          value={party.name}
          placeholder={namePlaceholder}
          onChange={(e) => set("name")(e.target.value)}
        />
      </Field>
      <Field label="Email">
        <TextInput
          type="email"
          value={party.email}
          placeholder="name@example.com"
          onChange={(e) => set("email")(e.target.value)}
        />
      </Field>
      <Field label="Phone">
        <TextInput
          type="tel"
          value={party.phone}
          placeholder="+256 700 000000"
          onChange={(e) => set("phone")(e.target.value)}
        />
      </Field>
      <Field label="Address" className="col-span-2">
        <TextArea
          value={party.address}
          placeholder="Street, city, country"
          onChange={(e) => set("address")(e.target.value)}
        />
      </Field>
      <Field label="Tax ID" className="col-span-2">
        <TextInput
          value={party.taxId}
          placeholder="Optional"
          onChange={(e) => set("taxId")(e.target.value)}
        />
      </Field>
    </div>
  );
}
