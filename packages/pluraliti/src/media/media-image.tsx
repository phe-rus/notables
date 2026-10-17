import type { CSSProperties } from "react";
import { useMediaSource } from "./media-source";

/** A photo whose source may be device media (`media:<id>`). */
export function MediaImage({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style?: CSSProperties;
}) {
  const playableSrc = useMediaSource(src);
  return playableSrc ? (
    <img
      className="nt-image"
      src={playableSrc}
      alt={alt}
      loading="lazy"
      draggable={false}
      style={style}
    />
  ) : (
    <div className="nt-image nt-image-pending" role="img" aria-label={alt || "Photo"} />
  );
}
