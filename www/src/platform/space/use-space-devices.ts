import { useSyncExternalStore } from "react";
import { spaceDeviceStore } from "./space-device-store";

export function useSpaceDevices() {
  return useSyncExternalStore(
    spaceDeviceStore.subscribe,
    spaceDeviceStore.getState,
    spaceDeviceStore.getState,
  );
}
