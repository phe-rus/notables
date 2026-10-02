/**
 * The splash screen waits for the app to say it's ready (its library
 * loaded), so the first thing people see is their own notes, not a flash.
 */
const READY = "notables:ready";
let ready = false;

export function markAppReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  window.dispatchEvent(new Event(READY));
}

export function onAppReady(callback: () => void): () => void {
  if (ready) {
    callback();
    return () => {};
  }
  window.addEventListener(READY, callback, { once: true });
  return () => window.removeEventListener(READY, callback);
}
