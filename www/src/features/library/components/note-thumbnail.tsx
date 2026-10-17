import { useMediaSource } from "@notables/pluraliti";

export function NoteThumbnail({ src, gallery = false }: { src: string; gallery?: boolean }) {
  const resolved = useMediaSource(src);
  if (!resolved) return null;
  return (
    <img
      src={resolved}
      alt=""
      loading="lazy"
      className={
        gallery
          ? "mb-2 aspect-video w-full rounded-lg object-cover"
          : "ms-3 size-14 shrink-0 rounded-lg object-cover"
      }
    />
  );
}
