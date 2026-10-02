import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { routeForAppLink } from "../../platform/app-links";
import { isTauri } from "../../platform/runtime";

/**
 * Opens `notables://` links in the installed app: the one that launched
 * it, and any opened while it runs (on desktop, a second launch hands its
 * link to this window).
 */
export function AppLinkListener() {
  const router = useRouter();

  useEffect(() => {
    if (!isTauri()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const open = (urls: string[] | null) => {
      const path = urls?.map(routeForAppLink).find((route) => route !== null);
      if (path) router.history.push(path);
    };
    void import("@tauri-apps/plugin-deep-link").then(async ({ getCurrent, onOpenUrl }) => {
      open(await getCurrent().catch(() => null));
      const unlisten = await onOpenUrl(open);
      if (cancelled) unlisten();
      else stop = unlisten;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [router]);

  return null;
}
