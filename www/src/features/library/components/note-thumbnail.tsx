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
          : "ms-3 size-12 shrink-0 self-center rounded-lg border border-separator/40 object-cover"
      }
    />
  );
}
