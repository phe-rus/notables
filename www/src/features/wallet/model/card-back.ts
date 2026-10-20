import type { CardSuggestions } from "./types";
import type { CardKind } from "./wallet-model";

export function backMatchesCard(
  kind: CardKind,
  front: Pick<CardSuggestions, "number" | "meter" | "account">,
  back: CardSuggestions,
) {
  if (back.kind !== "other" && back.kind !== kind) return false;
  const normalize = (value: string) => value.replace(/[ -]/g, "").toUpperCase();
  return (["number", "meter", "account"] as const).every(
    (key) => !front[key] || !back[key] || normalize(front[key]) === normalize(back[key]),
  );
}
