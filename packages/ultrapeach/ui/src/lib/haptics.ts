/** The feedback kinds the systems share, from a selection tick to an error. */
export type HapticKind =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

let player: (kind: HapticKind) => void = () => {};

/**
 * Components only ask for feedback; the app decides how it plays on this
 * device (system haptics, a vibration, or nothing) and whether it's on.
 */
export function setHapticPlayer(next: (kind: HapticKind) => void): void {
  player = next;
}

export function haptic(kind: HapticKind): void {
  player(kind);
}
