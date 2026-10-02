import type { HapticKind } from "@notables/ui";

/**
 * What the Android app offers the page directly (AndroidBridge.kt in
 * src-tauri/gen/android). Absent everywhere else.
 */
interface AndroidBridge {
  canPinWidget(): boolean;
  pinWidget(): boolean;
  haptic(kind: HapticKind): void;
}

export function androidBridge(): AndroidBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { NotablesAndroid?: AndroidBridge }).NotablesAndroid;
}
