import type { AccentId } from "@phe-rus/hino/tokens";
import type { CardFormValues, CardSuggestions, ManualCardFormProps } from "./types";
import type { CardKind } from "./wallet-model";

export const cardFormKeys = {
  bank: ["holder", "number", "expiry", "cvv"],
  "national-id": ["holder", "number", "expiry"],
  passport: ["holder", "number", "expiry"],
  electricity: ["meter", "account", "holder"],
  television: ["account", "number", "holder"],
  sim: ["number", "account", "puk", "holder"],
  membership: ["holder", "number", "expiry"],
  other: ["holder", "number", "account"],
} as const;

export function cardFormDefaults({ card, suggestions }: ManualCardFormProps): CardFormValues {
  const kind = card?.draft.kind ?? suggestions?.kind ?? "other";
  const existing = (key: Exclude<keyof CardSuggestions, "numberUncertain">) =>
    card?.draft.fields.find((field) => field.key === key)?.value ?? suggestions?.[key] ?? "";
  return {
    meter: existing("meter"),
    account: existing("account"),
    displayName: card?.draft.displayName ?? suggestions?.displayName ?? "",
    holder: existing("holder"),
    number: existing("number"),
    expiry: existing("expiry"),
    issuer: card?.draft.issuer ?? suggestions?.issuer ?? "",
    cvv: existing("cvv"),
    puk: existing("puk"),
    retainSecurityCode: card?.draft.retainSecurityCode ?? false,
    backAvailable: card?.draft.sideState.back === "available",
    palette:
      card?.draft.appearance.palette ??
      suggestions?.palette ??
      (
        {
          bank: "ocean",
          "national-id": "sage",
          passport: "rose",
          electricity: "honey",
          television: "graphite",
          sim: "honey",
          membership: "lavender",
          other: "blush",
        } satisfies Record<CardKind, AccentId>
      )[kind],
  };
}
