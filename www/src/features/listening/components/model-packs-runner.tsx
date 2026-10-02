import { useEffect } from "react";
import { isTauri } from "../../../platform/runtime";
import { runAutoDownloads } from "../lib/model-packs";
import { getNarrationSettings } from "../lib/narration-settings";

/** Coming back to the app tries again at most this often. */
const RETRY_EVERY = 10 * 60 * 1000;

/**
 * Fetches the natural voice in the background, and newer versions of
 * installed packs: once after the app opens, and again when it returns
 * to the foreground. Phones wait for Wi-Fi unless mobile data is allowed.
 */
export function ModelPacksRunner() {
  useEffect(() => {
    if (!isTauri()) return;
    let last = Date.now();
    void runAutoDownloads(getNarrationSettings().downloadOnMobileData).catch(() => {});
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < RETRY_EVERY) return;
      last = Date.now();
      void runAutoDownloads(getNarrationSettings().downloadOnMobileData).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
