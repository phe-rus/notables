import { useSyncExternalStore } from "react";
import { appUpdateStore } from "../store/app-update-store";

export function useAppUpdates() {
  return useSyncExternalStore(
    appUpdateStore.subscribe,
    appUpdateStore.getState,
    appUpdateStore.getServerState,
  );
}
