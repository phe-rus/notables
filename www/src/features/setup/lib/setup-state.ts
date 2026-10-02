/**
 * Whether this device has been set up. People who used Notables before
 * setup existed (their library was already welcomed) aren't asked again.
 */
const SETUP_DONE = "notables:setup-done";
const WELCOMED = "notables:welcomed";

export function needsSetup(): boolean {
  try {
    if (localStorage.getItem(SETUP_DONE)) return false;
    if (localStorage.getItem(WELCOMED)) {
      markSetupDone();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markSetupDone() {
  try {
    localStorage.setItem(SETUP_DONE, new Date().toISOString());
  } catch {
    // Without storage, setup simply shows again next time.
  }
}

/** Language is English for now; the choice is kept for when more arrive. */
export const LANGUAGE_KEY = "notables:language";
