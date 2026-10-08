import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/class-names";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  tone?: "default" | "accent" | "inverse";
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = "default", size = "sm", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      data-tooltip={label}
      className={cn(
        "group inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-fast ease-standard active:scale-[0.92] disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
        size === "sm" ? "size-9" : "size-11",
        tone === "default" && "text-label-secondary hover:bg-fill/80 hover:text-label",
        tone === "accent" && "text-accent-text hover:bg-accent-soft",
        tone === "inverse" && "text-on-inverse hover:bg-white/10",
        className,
      )}
      {...props}
    />
  );
});
