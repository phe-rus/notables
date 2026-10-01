import { cn } from "@notables/ui";

/** The Notables mark: a honey tile with the N stroke. */
export function AppMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[28%] bg-accent text-on-accent",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        data-brand
      >
        <path d="M6 19V5l12 14V5" />
      </svg>
    </span>
  );
}
