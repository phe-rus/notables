import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

export const SettingsToolbarContext = createContext<HTMLElement | null>(null);

/** Keep a page's action beside its title in both single and split views. */
export function SettingsToolbarAction({ children }: { children: ReactNode }) {
  const host = useContext(SettingsToolbarContext);
  return host ? createPortal(children, host) : null;
}
