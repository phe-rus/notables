import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export function openSearch() {
  open = true;
  emit();
}

export function closeSearch() {
  open = false;
  emit();
}

export function toggleSearch() {
  open = !open;
  emit();
}

export function useSearchOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false,
  );
}
