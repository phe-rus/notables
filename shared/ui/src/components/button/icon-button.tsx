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
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-[background-color,transform] duration-fast ease-standard active:scale-[0.94] disabled:opacity-40",
        size === "sm" ? "size-[34px]" : "size-11",
        tone === "default" && "text-label hover:bg-fill",
        tone === "accent" && "text-accent-text hover:bg-fill",
        tone === "inverse" && "text-on-inverse hover:bg-white/10",
        className,
      )}
      {...props}
    />
  );
});
