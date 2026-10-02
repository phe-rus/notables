import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/class-names";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md";

/**
 * Each variant has a little depth: a fine highlight along the top edge and
 * a soft, layered shadow, like a well-made physical key.
 */
const variants: Record<Variant, string> = {
  primary:
    "bg-inverse text-on-inverse shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(0_0_0/0.18),0_6px_16px_-6px_rgb(0_0_0/0.35)] hover:brightness-[1.12]",
  secondary:
    "bg-elevated text-label shadow-[inset_0_0_0_1px_var(--color-separator),0_1px_2px_rgb(40_30_0/0.06)] hover:bg-fill/60",
  ghost: "bg-transparent text-label hover:bg-fill/80",
  accent:
    "bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(60_40_0/0.16),0_6px_16px_-6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)] hover:brightness-[1.04]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[14px] rounded-full",
  md: "h-11 px-5 text-[15px] rounded-full",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "sm", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "group inline-flex select-none items-center justify-center gap-2 font-semibold tracking-[-0.005em] transition-[background-color,filter,transform,box-shadow] duration-fast ease-standard active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
