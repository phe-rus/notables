import { isTauri } from "./runtime";

/** The deployed site, which packaged apps reach for everything the Worker serves. */
const DEPLOYED_SITE = "https://notables.pherus.org";

/**
 * Where a packaged app finds the Worker: VITE_PUBLIC_URL when a build sets
 * it, otherwise the deployed site. Release builds don't set it, and without
 * this default they looked for the Worker on the phone itself.
 */
export function deployedSite(): string {
  return (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? DEPLOYED_SITE;
}

/**
 * Public URL for a path. Inside a packaged app the page origin is the app
 * bundle, so shareable links use the deployed site instead.
 */
export function publicUrl(path: string): string {
  const origin =
    isTauri() && import.meta.env.PROD
      ? deployedSite()
      : ((import.meta.env.VITE_PUBLIC_URL as string | undefined) ??
        (typeof window !== "undefined" ? window.location.origin : ""));
  return new URL(path, origin).href;
}
