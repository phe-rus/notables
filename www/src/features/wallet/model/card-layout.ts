import { t } from "../../../i18n/i18n";
import type { CardKind } from "./wallet-model";

/**
 * What a card shows on its face, by kind: the identifier people look for
 * first (large, in the middle) and the details along the bottom edge. The
 * rest of a card's fields appear in its details list.
 */
export const cardFaceFields: Record<CardKind, { primary: string; footer: readonly string[] }> = {
  bank: { primary: "number", footer: ["holder", "expiry"] },
  "national-id": { primary: "number", footer: ["holder", "expiry"] },
  passport: { primary: "number", footer: ["holder", "expiry"] },
  electricity: { primary: "meter", footer: ["holder", "account"] },
  television: { primary: "account", footer: ["holder", "number"] },
  sim: { primary: "number", footer: ["holder", "account"] },
  membership: { primary: "number", footer: ["holder", "expiry"] },
  other: { primary: "number", footer: ["holder", "account"] },
};

/** Identifiers read left to right whatever the language, so digits keep their order. */
export const ltrFieldKeys: ReadonlySet<string> = new Set([
  "number",
  "expiry",
  "cvv",
  "meter",
  "account",
]);

/** Field names as each kind of card prints them: a SIM's number is a phone number. */
export function fieldLabels(kind: CardKind) {
  return {
    meter: t("wallet.meter"),
    account: kind === "sim" ? t("wallet.iccid") : t("wallet.account"),
    puk: t("wallet.puk"),
    holder: t("wallet.holder"),
    number: kind === "sim" ? t("wallet.phoneNumber") : t("wallet.number"),
    expiry: t("wallet.expiry"),
  };
}
