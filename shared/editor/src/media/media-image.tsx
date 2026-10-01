import { useMediaSource } from "./media-source";

/** A photo whose source may be device media (`media:<id>`). */
export function MediaImage({ src, alt }: { src: string; alt: string }) {
  const playableSrc = useMediaSource(src);
  return playableSrc ? (
    <img className="nt-image" src={playableSrc} alt={alt} loading="lazy" draggable={false} />
  ) : (
    <div className="nt-image nt-image-pending" role="img" aria-label={alt || "Photo"} />
  );
}
