import { useSyncExternalStore } from "react";
import { syncedSetting } from "./settings/synced-settings";

/** The person's name, on every device and on publications, until profiles exist. */
const name = syncedSetting("notables:author-name", "text");

export function getAuthorName(): string {
  const value = name.get();
  return typeof value === "string" ? value : "";
}

export function setAuthorName(next: string): void {
  name.set(next);
}

export function useAuthorName(): string {
  return useSyncExternalStore(name.subscribe, getAuthorName, () => "");
}
