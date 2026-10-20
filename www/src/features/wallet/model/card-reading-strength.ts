import type { CardReading } from "./types";

/** Useful identifiers outweigh a confident reading of unrelated background words. */
export function cardReadingStrength(reading: CardReading) {
  const fields = reading.suggestions;
  const identifiers = [fields.number, fields.meter, fields.account, fields.puk, fields.cvv].filter(
    Boolean,
  ).length;
  const details = [fields.holder, fields.expiry].filter(Boolean).length;
  return (
    ((identifiers * (fields.numberUncertain ? 60 : 150) +
      details * 15 +
      (fields.kind === "other" ? 0 : 30)) *
      Math.max(0, Math.min(100, reading.confidence))) /
    100
  );
}
