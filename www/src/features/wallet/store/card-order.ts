import { createStore, useSelector } from "@tanstack/react-store";

/**
 * The order of cards in the stack, chosen by swiping a card to the front.
 * Kept on this device as card IDs only: random UUIDs, never card details.
 */
const KEY = "notables:wallet-order";

function load(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

const order = createStore<string[]>(typeof window === "undefined" ? [] : load());

export const useCardOrder = () => useSelector(order);

/** Cards in stack order, back to front. Cards not yet placed join at the front. */
export function arrange<T extends { id: string }>(cards: T[], placed: string[]): T[] {
  const rank = new Map(placed.map((id, index) => [id, index]));
  return [...cards].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Brings one card to the front of the stack, where it shows in full. */
export function moveCardToFront(id: string, shown: string[]) {
  const next = [...shown.filter((other) => other !== id), id];
  order.setState(() => next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this session.
  }
}
