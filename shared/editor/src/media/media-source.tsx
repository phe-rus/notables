import { localMediaId } from "@notables/core";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

/** Resolves a device media id (see `media:<id>` in @notables/core) to a playable URL. */
export type MediaResolver = (mediaId: string) => Promise<string | null>;

const MediaResolverContext = createContext<MediaResolver | null>(null);

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
  }, [mediaId, resolve, src]);

  return resolved;
}
