import type { CardReading } from "../model/types";

/** Do not accept a card until independent frames agree on its useful details. */
export function createCardStability(back = false) {
  let previous = "";
  return (reading: CardReading) => {
    const fields = reading.suggestions;
    const identifier =
      fields.meter || fields.account || fields.number || (back ? fields.cvv || fields.puk : "");
    if (
      reading.confidence < 65 ||
      !identifier ||
      fields.numberUncertain ||
      (!back && fields.kind === "other")
    ) {
      previous = "";
      return false;
    }
    const fingerprint = JSON.stringify([
      fields.kind,
      identifier.replace(/[ -]/g, ""),
      fields.expiry,
      fields.holder,
    ]);
    const stable = previous === fingerprint;
    previous = fingerprint;
    return stable;
  };
}
