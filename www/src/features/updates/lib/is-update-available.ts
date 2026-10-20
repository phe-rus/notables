import type { AppRelease, InstalledRelease } from "../model/types";
import { compareVersions } from "./compare-versions";

export function isUpdateAvailable(
  release: AppRelease,
  installed: Pick<InstalledRelease, "version" | "build">,
) {
  const comparison = compareVersions(release.version, installed.version);
  return (
    comparison !== null && (comparison > 0 || (comparison === 0 && release.build > installed.build))
  );
}
