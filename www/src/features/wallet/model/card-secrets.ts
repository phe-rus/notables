import type { WalletCard } from "./wallet-model";

export const isSecretField = (field: { key: string; sensitive?: boolean }) =>
  field.sensitive || field.key === "cvv" || field.key === "puk";

export function redactCard(card: WalletCard): WalletCard {
  return {
    ...card,
    draft: {
      ...card.draft,
      fields: card.draft.fields.map((field) =>
        isSecretField(field) ? { ...field, value: "", redacted: true } : field,
      ),
    },
  };
}
