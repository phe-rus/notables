import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-inverse text-on-inverse hover:opacity-90",
  secondary: "border border-separator bg-elevated text-label hover:bg-fill",
  ghost: "bg-transparent text-label hover:bg-fill",
  accent: "bg-accent text-on-accent hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-[34px] px-3.5 text-[14px] rounded-[9px]",
  md: "h-11 px-4 text-[15px] rounded-xl",
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
        "inline-flex select-none items-center justify-center gap-2 font-semibold transition-[background-color,opacity,transform] duration-fast ease-standard active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

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
