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

/** Where the chosen language is kept; see i18n. */
export { LANGUAGE_KEY } from "../../../i18n/i18n";
