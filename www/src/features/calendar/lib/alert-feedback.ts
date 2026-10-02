import { playHaptic } from "../../../platform/haptics";
import { getAlertSettings } from "./alert-settings";

let context: AudioContext | undefined;

/**
 * A soft two-note chime, made on the spot so there is no sound file to
 * ship. Browsers only allow audio after the page has been used once.
 */
export function playChime() {
  try {
    context ??= new AudioContext();
    const start = context.currentTime + 0.02;
    for (const [index, frequency] of [880, 1318.5].entries()) {
      const at = start + index * 0.16;
      const tone = context.createOscillator();
      const level = context.createGain();
      tone.type = "sine";
      tone.frequency.value = frequency;
      level.gain.setValueAtTime(0, at);
      // Loud and clear: the device volume, not the chime, sets how loud.
      level.gain.linearRampToValueAtTime(0.45, at + 0.015);
      level.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      tone.connect(level).connect(context.destination);
      tone.start(at);
      tone.stop(at + 1);
    }
  } catch {
    // No audio here; the notification still shows.
  }
}

/** A firm double tap, through the system's own haptics where there are any. */
export function buzz() {
  playHaptic("warning");
}

/** Sound and touch for an alert, as the person chose. */
export function alertFeedback() {
  const { sound, haptics } = getAlertSettings();
  if (sound) playChime();
  if (haptics) buzz();
}
