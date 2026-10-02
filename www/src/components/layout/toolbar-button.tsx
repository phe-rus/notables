import { cn } from "@notables/ui";
import type { ReactNode } from "react";

/** A small, quiet icon button for window and pane toolbars. */
export function ToolbarButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-label-tertiary transition-colors duration-fast hover:bg-fill/80 hover:text-label active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  );
}
