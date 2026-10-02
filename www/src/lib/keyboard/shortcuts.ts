export const isApplePlatform =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere. */
export function shortcutLabel(key: string): string {
  return isApplePlatform ? `⌘${key}` : `Ctrl ${key}`;
}

/** True for ⌘<key> on Apple platforms and Ctrl+<key> elsewhere. */
export function isShortcut(event: KeyboardEvent, key: string): boolean {
  const modifier = isApplePlatform ? event.metaKey : event.ctrlKey;
  return modifier && !event.altKey && event.key.toLowerCase() === key.toLowerCase();
}
