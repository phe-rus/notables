import type { ReactNode } from "react";
export type FloatingSearchToolbarProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  action: { label: string; icon: ReactNode; onPress: (anchor: HTMLButtonElement) => void };
  leading?: ReactNode;
};
