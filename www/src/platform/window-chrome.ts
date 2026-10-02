import { isTauri } from "./runtime";

/** Which window controls the desktop app shows. */
export type WindowChrome = "native-mac" | "custom" | "none";

/**
 * macOS keeps its own traffic lights over our sidebar; Windows and Linux
 * windows are undecorated and draw ours. Browsers and phones have none.
 */
export function windowChrome(): WindowChrome {
  if (!isTauri()) return "none";
  const agent = navigator.userAgent;
  if (/Android|iPhone|iPad/.test(agent)) return "none";
  return agent.includes("Mac") ? "native-mac" : "custom";
}
