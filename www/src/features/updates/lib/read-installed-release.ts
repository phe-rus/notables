import { isTauri } from "@/platform/runtime";
import type { InstalledRelease } from "../model/types";
import { isReleaseChannel } from "./is-release-channel";

export async function readInstalledRelease(): Promise<InstalledRelease | null> {
  if (!isTauri() || import.meta.env.DEV) return null;
  const build = Number(import.meta.env.VITE_BUILD_NUMBER);
  if (!Number.isSafeInteger(build) || build < 1) return null;
  const [{ getVersion }, { invoke }] = await Promise.all([
    import("@tauri-apps/api/app"),
    import("@tauri-apps/api/core"),
  ]);
  const [version, channel] = await Promise.all([
    getVersion(),
    invoke<unknown>("app_release_channel"),
  ]);
  return isReleaseChannel(channel) ? { version, build, channel } : null;
}
