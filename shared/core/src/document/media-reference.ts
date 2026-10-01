/**
 * Media stored on a device is referenced inside documents as `media:<id>`.
 * Apps resolve these to playable URLs; publishing rewrites them to public
 * URLs.
 */
export const LOCAL_MEDIA_SCHEME = "media:";

export function localMediaSrc(mediaId: string): string {
  return `${LOCAL_MEDIA_SCHEME}${mediaId}`;
}

/** The media id of a local `media:` source, or null for any other URL. */
export function localMediaId(src: string): string | null {
  return src.startsWith(LOCAL_MEDIA_SCHEME) ? src.slice(LOCAL_MEDIA_SCHEME.length) || null : null;
}
