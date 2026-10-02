import { useEffect } from "react";
import { textSizes } from "../model/preferences";
import { usePreferences } from "../store/preferences-store";

/** Applies theme, accent and text size to the document root. */
export function AppearanceSync() {
  const { theme, accent, textSize } = usePreferences();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    if (accent === "honey") root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", accent);
    root.style.setProperty("--nt-body-size", `${textSizes[textSize].bodyPx}px`);
  }, [theme, accent, textSize]);

  return null;
}
