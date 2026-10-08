import { type HapticKind, setHapticPlayer } from "@ultrapeach/ui";
import { getPreferences } from "../features/settings/store/preferences-store";
import { androidBridge } from "./android-bridge";

/** Vibration patterns for browsers that can vibrate but have no system haptics. */
const patterns: Record<HapticKind, number | number[]> = {
  selection: 6,
  light: 10,
  medium: 16,
  heavy: 26,
  success: [12, 60, 18],
  warning: [22, 70, 22],
  error: [30, 60, 30, 60, 30],
};

/** Plays a haptic the way this device does it best, ignoring the setting. */
export function playHaptic(kind: HapticKind): void {
  const android = androidBridge();
  if (android) {
    android.haptic(kind);
    return;
  }
  // Only phones and tablets; a laptop that reports vibrate has nothing to feel.
  if (!matchMedia("(pointer: coarse)").matches) return;
  try {
    navigator.vibrate?.(patterns[kind]);
  } catch {
    // Not supported.
  }
}

/** Whether this device can give any touch feedback at all. */
export function hapticsAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return (
    Boolean(androidBridge()) ||
    (matchMedia("(pointer: coarse)").matches && typeof navigator.vibrate === "function")
  );
}

/** Lets the app's controls tap back, while Haptics is on in Settings. */
export function installHaptics(): void {
  setHapticPlayer((kind) => {
    if (getPreferences().haptics) playHaptic(kind);
  });
}
