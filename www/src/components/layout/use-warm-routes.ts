import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/** The screens people open first, by route id. */
const FIRST_SCREENS = ["/_app/notes/$noteId"] as const;

/**
 * Loads the code of the screens people open first once the app has
 * settled, so the first tap doesn't wait for it. On a mid-range Android
 * phone the note screen took about 600 ms to open the first time and
 * 80 ms after; touch only hints at a tap ~100 ms ahead, too late to help.
 */
export function useWarmRoutes() {
  const router = useRouter();
  useEffect(() => {
    const warm = () => {
      for (const id of FIRST_SCREENS)
        void router.loadRouteChunk(router.routesById[id])?.catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(warm, 1500);
    return () => clearTimeout(timer);
  }, [router]);
}
