import { localMediaId } from "@notables/core";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

/** Resolves a device media id (see `media:<id>` in @notables/core) to a playable URL. */
export type MediaResolver = (mediaId: string) => Promise<string | null>;

const MediaResolverContext = createContext<MediaResolver | null>(null);

/** Media still loading by id, waiting to hear their file has arrived. */
const waiting = new Map<string, Set<() => void>>();

/**
 * Tells everything showing `mediaId` that its file is now on this device,
 * as when it arrives from another device, so it loads it again.
 */
export function announceMediaArrived(mediaId: string) {
  for (const reload of waiting.get(mediaId) ?? []) reload();
}

export function MediaResolverProvider({
  resolve,
  children,
}: {
  resolve: MediaResolver;
  children: ReactNode;
}) {
  return <MediaResolverContext.Provider value={resolve}>{children}</MediaResolverContext.Provider>;
}

/** A playable URL for `src`, resolving local media through the provider. */
export function useMediaSource(src: string): string | null {
  const resolve = useContext(MediaResolverContext);
  const mediaId = localMediaId(src);
  const [resolved, setResolved] = useState<string | null>(mediaId ? null : src);
  const [arrivals, setArrivals] = useState(0);

  // A file that arrives later is loaded again; showing nothing in between
  // gives the image a fresh element, so a failed first load isn't reused.
  useEffect(() => {
    if (!mediaId) return;
    const reload = () => {
      setResolved(null);
      setArrivals((count) => count + 1);
    };
    const listeners = waiting.get(mediaId) ?? new Set();
    listeners.add(reload);
    waiting.set(mediaId, listeners);
    return () => {
      listeners.delete(reload);
      if (listeners.size === 0) waiting.delete(mediaId);
    };
  }, [mediaId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: arrivals asks for a fresh resolve
  useEffect(() => {
    if (!mediaId) {
      setResolved(src);
      return;
    }
    if (!resolve) {
      setResolved(null);
      return;
    }
    let active = true;
    resolve(mediaId).then((url) => active && setResolved(url));
    return () => {
      active = false;
    };
  }, [mediaId, resolve, src, arrivals]);

  return resolved;
}
