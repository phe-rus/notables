/** True the first time `key` is seen in this browser session. */
export function oncePerSession(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // Without storage every visit counts; acceptable for view counters.
  }
  return true;
}
