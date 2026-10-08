import { createStore, useSelector } from "@tanstack/react-store";

const search = createStore(false);

export function openSearch() {
  search.setState(() => true);
}

export function closeSearch() {
  search.setState(() => false);
}

export function toggleSearch() {
  search.setState((open) => !open);
}

export function useSearchOpen(): boolean {
  return useSelector(search);
}
