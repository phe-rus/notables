import type { AppRelease } from "../model/types";
import { parseVersion } from "./parse-version";

export function parseRelease(value: unknown): AppRelease | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.version !== "string" ||
    !parseVersion(entry.version) ||
    typeof entry.build !== "number" ||
    !Number.isSafeInteger(entry.build) ||
    entry.build < 1 ||
    typeof entry.availableAt !== "string" ||
    !Number.isFinite(Date.parse(entry.availableAt))
  )
    return null;
  return { version: entry.version, build: entry.build, availableAt: entry.availableAt };
}
