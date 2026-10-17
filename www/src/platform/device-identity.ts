import { createId } from "@notables/core";
import { ownsLibrary } from "./library-access";
import { browserSession } from "./session/browser-session-store";

const KEY = "notables:device-id";
let cached: string | undefined;

/**
 * A stable, random id for this installation. Until Pherus identity lands
 * (ADR-0005) it attributes notes and social actions to this device.
 */
export function getDeviceId(): string {
  const session = browserSession();
  if (session) return session.browserId;
  if (!ownsLibrary()) {
    cached ??= createId();
    return cached;
  }
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY) ?? undefined;
    if (!cached) {
      cached = createId();
      localStorage.setItem(KEY, cached);
    }
  } catch {
    cached ??= createId();
  }
  return cached;
}
