import type { PropsWithChildren } from "react";

export type ToolbarButtonProps = PropsWithChildren<{
  label: string;
  className?: string;
  onClick: () => void;
}>;
