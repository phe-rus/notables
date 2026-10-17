import type { HapticKind } from "@phe-rus/hino";

/**
 * What the Android app offers the page directly (AndroidBridge.kt in
 * src-tauri/gen/android). Absent everywhere else.
 */
interface AndroidBridge {
  hasHardwareKeyboard?(): boolean;
  canPinWidget(): boolean;
  pinWidget(): boolean;
  haptic(kind: HapticKind): void;
  /** Dark icons for a light app and light icons for a dark one. Optional: older app builds lack it. */
  setSystemBarsDark?(dark: boolean): void;
  setWindowBackground?(hex: string): void;
  /** Maker and model, e.g. "TECNO CAMON 19", for About. */
  deviceModel?(): string;
  shareText?(title: string, text: string): boolean;
}

export function androidBridge(): AndroidBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { NotablesAndroid?: AndroidBridge }).NotablesAndroid;
}
