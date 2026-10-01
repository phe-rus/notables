import { createId } from "@notables/core";

const KEY = "notables:device-id";
let cached: string | undefined;

/**
 * A stable, random id for this installation. Until Pherus identity lands
 * (ADR-0005) it attributes notes and social actions to this device.
 */
export function getDeviceId(): string {
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
