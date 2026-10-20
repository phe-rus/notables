import { t } from "@/i18n/i18n";
import { cardFormKeys } from "./card-form-defaults";
import { fieldLabels } from "./card-layout";
import type { CardDraftContext, CardFormValues } from "./types";
import type { CardDraft } from "./wallet-model";

export function buildCardDraft(
  value: CardFormValues,
  { card, suggestions, id, kind, fieldIds, backKeys, protectedKeys }: CardDraftContext,
): CardDraft {
  const labels = { ...fieldLabels(kind), cvv: t("wallet.securityCode") };
  const keys = cardFormKeys[kind];
  const fields = keys
    .filter(
      (key) =>
        key !== "cvv" ||
        (value.retainSecurityCode &&
          (value.cvv !== "" ||
            card?.draft.fields.some((field) => field.key === "cvv" && field.redacted))),
    )
    .map((key, order) => {
      let fieldId = fieldIds.get(key);
      if (!fieldId) {
        fieldId = crypto.randomUUID();
        fieldIds.set(key, fieldId);
      }
      return {
        id: fieldId,
        cardId: id,
        key,
        label: labels[key],
        value: value[key],
        order,
        side: key === "cvv" || backKeys.has(key) ? ("back" as const) : ("front" as const),
        sensitive: protectedKeys.has(key),
        redacted:
          card?.draft.fields.some((field) => field.key === key && field.redacted) &&
          value[key] === "",
        source:
          suggestions?.[key] === value[key] && value[key] !== ""
            ? ("recognition" as const)
            : (card?.draft.fields.find((field) => field.key === key && field.value === value[key])
                ?.source ?? ("manual" as const)),
      };
    });
  const draft: CardDraft = {
    id,
    kind,
    displayName: value.displayName,
    issuer: value.issuer || null,
    templateId: `${kind}-landscape`,
    templateVersion: 1,
    sideState: {
      front: "available",
      back:
        value.backAvailable || (value.retainSecurityCode && value.cvv !== "")
          ? "available"
          : "missing",
    },
    fields: [
      ...fields,
      ...(card?.draft.fields.filter((field) => field.key.startsWith("custom:")) ?? []),
    ],
    appearance: { formFactor: "landscape", palette: value.palette },
    retainSecurityCode: kind === "bank" && value.retainSecurityCode,
  };

  return draft;
}
