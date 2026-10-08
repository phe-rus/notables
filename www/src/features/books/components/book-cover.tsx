import { useMediaSource } from "@notables/pluraliti";
import { cn } from "@ultrapeach/ui";

/**
 * A book cover with a bound spine edge: the book's own cover image when it
 * has one, otherwise drawn from its title and author. Sized by its width
 * alone: type and spacing scale with the cover.
 */
export function BookCover({
  title,
  author,
  image,
  className,
}: {
  title: string;
  author: string;
  /** `media:<id>` or URL of a cover image. */
  image?: string | null;
  className?: string;
}) {
  const resolved = useMediaSource(image ?? "");
  return (
    <div
      className={cn(
        "@container relative flex aspect-[3/4] shrink-0 flex-col justify-between overflow-hidden rounded-[3px_7px_7px_3px] bg-[#2a3a44] text-white shadow-[0_18px_40px_-14px_rgb(20_30_40/0.55)]",
        className,
      )}
    >
      {image && resolved ? (
        <img
          src={resolved}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <>
          <span className="py-[12cqw] pr-[10cqw] pl-[16cqw] font-serif text-[13cqw] leading-[1.1] font-semibold break-words">
            {title || "Untitled"}
          </span>
          <span className="pr-[10cqw] pb-[11cqw] pl-[16cqw] text-[6.5cqw] tracking-[0.08em] text-white/75 uppercase">
            {author || "Notables"}
          </span>
        </>
      )}
      <span
        className="absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/30 via-white/10 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
