import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

/**
 * Media stored on the device is referenced as `media:<id>` inside documents.
 * Apps resolve those ids to playable URLs (blob URLs, the native file
 * system…) by providing a MediaResolver.
 */
export const LOCAL_MEDIA_SCHEME = "media:";

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

export function localMediaSrc(mediaId: string): string {
  return `${LOCAL_MEDIA_SCHEME}${mediaId}`;
}

/** The media id of a local `media:` source, or null for any other URL. */
export function localMediaId(src: string): string | null {
  return src.startsWith(LOCAL_MEDIA_SCHEME) ? src.slice(LOCAL_MEDIA_SCHEME.length) || null : null;
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
