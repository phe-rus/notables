import { defaultAccent } from "@ultrapeach/tokens";
import { useEffect } from "react";
import { devicePlatform } from "../../../platform/device-platform";
import { textSizes } from "../model/preferences";
import { usePreferences } from "../store/preferences-store";

/** Applies theme, accent and text size (editor and interface) to the document root, and names the system for CSS. */
export function AppearanceSync() {
  const { theme, accent, textSize } = usePreferences();

  // Lets styles follow a system's conventions where they differ (data-os="android").
  useEffect(() => {
    window.document.documentElement.setAttribute("data-os", devicePlatform().os);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    if (accent === defaultAccent) root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", accent);
    root.style.setProperty("--nt-body-size", `${textSizes[textSize].bodyPx}px`);
    // Interface text follows the same choice, the way Dynamic Type does.
    root.style.setProperty(
      "--type-scale",
      String(textSizes[textSize].bodyPx / textSizes.medium.bodyPx),
    );
  }, [theme, accent, textSize]);

  return null;
}
