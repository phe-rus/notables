import type { AppRelease, ReleaseChannel } from "../model/types";
import { parseRelease } from "./parse-release";

export function readReleasePolicy(value: unknown, channel: ReleaseChannel): AppRelease | null {
  if (!value || typeof value !== "object") throw new Error("invalid-release-manifest");
  const manifest = value as Record<string, unknown>;
  if (manifest.schema !== 1 || !manifest.channels || typeof manifest.channels !== "object")
    throw new Error("invalid-release-manifest");
  const entry = (manifest.channels as Record<string, unknown>)[channel];
  if (entry === null) return null;
  const release = parseRelease(entry);
  if (!release) throw new Error("invalid-release");
  return release;
}
