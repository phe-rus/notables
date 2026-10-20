import type { CardReading } from "./types";

/** Logos alone must not open an empty Wallet review. Document scanning accepts any text. */
export function hasCardDetails(reading: CardReading) {
  const fields = reading.suggestions;
  return [
    fields.number,
    fields.meter,
    fields.account,
    fields.holder,
    fields.expiry,
    fields.puk,
    fields.cvv,
  ].some((value) => !!value?.trim());
}
