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
  /** The phone's voices (android-speech.ts). Optional: older app builds lack them. */
  speechVoices?(): string | null;
  speak?(id: string, text: string, lang: string, voiceId: string, rate: number): void;
  stopSpeaking?(): void;
  /** Maker and model, e.g. "TECNO CAMON 19", for About. */
  deviceModel?(): string;
}

export function androidBridge(): AndroidBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { NotablesAndroid?: AndroidBridge }).NotablesAndroid;
}
