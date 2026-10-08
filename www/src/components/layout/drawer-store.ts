import { createStore, useSelector } from "@tanstack/react-store";

/** Whether the library drawer is open on phones and tablets. */
const drawer = createStore(false);

export function setDrawerOpen(next: boolean) {
  drawer.setState(() => next);
}

export function useDrawerOpen(): boolean {
  return useSelector(drawer);
}
