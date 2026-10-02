import { useSyncExternalStore } from "react";

/** Whether the library drawer is open on phones and tablets. */
let open = false;
const listeners = new Set<() => void>();

export function setDrawerOpen(next: boolean) {
  if (open === next) return;
  open = next;
  for (const listener of listeners) listener();
}

export function useDrawerOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false,
  );
}
