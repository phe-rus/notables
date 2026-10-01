/** True inside the Tauri shell (iOS, Android, macOS, Windows, Linux). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}
