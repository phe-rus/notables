import { updateDestinations } from "../model/constants";
import type { ReleaseChannel } from "../model/types";

export function isReleaseChannel(value: unknown): value is ReleaseChannel {
  return typeof value === "string" && Object.hasOwn(updateDestinations, value);
}
