import type { HapticKind } from "@ultrapeach/ui";

/**
 * What the Android app offers the page directly (AndroidBridge.kt in
 * src-tauri/gen/android). Absent everywhere else.
 */
interface AndroidBridge {
  canPinWidget(): boolean;
  pinWidget(): boolean;
  haptic(kind: HapticKind): void;
  /** Dark icons for a light app and light icons for a dark one. Optional: older app builds lack it. */
  setSystemBarsDark?(dark: boolean): void;
}

export function androidBridge(): AndroidBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { NotablesAndroid?: AndroidBridge }).NotablesAndroid;
}
