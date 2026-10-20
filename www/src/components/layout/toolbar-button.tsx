import { IconButton } from "@phe-rus/hino/icon-button";
import type { ToolbarButtonProps } from "./types";

/** Shared pane toolbars use the same Hino control as the rest of the app. */
export function ToolbarButton({ label, onClick, className, children }: ToolbarButtonProps) {
  return (
    <IconButton
      label={label}
      size="icon-sm"
      variant="ghost"
      onClick={onClick}
      className={className}
    >
      {children}
    </IconButton>
  );
}
