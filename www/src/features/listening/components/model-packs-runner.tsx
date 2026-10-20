import { toast } from "@phe-rus/hino";
import { useEffect, useRef } from "react";
import { t } from "@/i18n/i18n";
import { isTauri } from "@/platform/runtime";
import { runAutoDownloads, useModelPacks } from "../lib/model-packs";
import { getNarrationSettings, setNarrationSettings } from "../lib/narration-settings";
import { naturalVoiceInfo } from "../lib/natural-voice";

/** Coming back to the app tries again at most this often. */
const RETRY_EVERY = 10 * 60 * 1000;

/**
 * Fetches the natural voice in the background, and newer versions of
 * installed packs: once after the app opens, and again when it returns
 * to the foreground. Phones wait for Wi-Fi unless mobile data is allowed.
 * A voice that has just arrived becomes the reading voice, in its
 * default style.
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

  const installed = useModelPacks()?.find((pack) => pack.kind === "voice")?.installedVersion;
  const before = useRef(installed);
  useEffect(() => {
    const had = before.current;
    before.current = installed;
    // Only a voice arriving while the app watched, not one already there at launch.
    if (had !== null || !installed) return;
    void naturalVoiceInfo().then((info) => {
      if (!info?.defaultStyle) return;
      setNarrationSettings({ voiceId: `device-neural:${info.defaultStyle}` });
      toast.success(t("listening.voiceReady"));
    });
  }, [installed]);

  return null;
}
