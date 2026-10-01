import { cn } from "@notables/ui";

/**
 * A book cover drawn from the book's metadata, with a bound spine edge.
 * Sized by its width alone: type and spacing scale with the cover.
 */
export function BookCover({
  title,
  author,
  className,
}: {
  title: string;
  author: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "@container relative flex aspect-[3/4] shrink-0 flex-col justify-between overflow-hidden rounded-[6px_14px_14px_6px] bg-[#2a3a44] text-white shadow-[0_18px_40px_-14px_rgb(20_30_40/0.55)]",
        className,
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/30 via-white/10 to-transparent"
        aria-hidden="true"
      />
      <span className="py-[12cqw] pr-[10cqw] pl-[16cqw] font-serif text-[13cqw] leading-[1.1] font-semibold break-words">
        {title || "Untitled"}
      </span>
      <span className="pr-[10cqw] pb-[11cqw] pl-[16cqw] text-[6.5cqw] tracking-[0.08em] text-white/75 uppercase">
        {author || "Notables"}
      </span>
    </div>
  );
}
