import { GRACE_MS } from "../model/constants";
import type { AppRelease } from "../model/types";

export function updateDeadline(release: AppRelease): number {
  return Date.parse(release.availableAt) + GRACE_MS;
}
