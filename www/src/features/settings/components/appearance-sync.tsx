import { defaultAccent } from "@phe-rus/hino/tokens";
import { useEffect } from "react";
import { androidBridge } from "../../../platform/android-bridge";
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

  // Android draws status and navigation bar icons for the system's appearance;
  // tell it the app's, or a light app on a dark phone gets white icons on white.
  useEffect(() => {
    const bridge = androidBridge();
    const setDark = bridge?.setSystemBarsDark?.bind(bridge);
    if (!setDark) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setDark(theme === "dark" || (theme === "system" && media.matches));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    const bridge = androidBridge();
    if (!bridge?.setWindowBackground) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      // A canvas resolves Hino's CSS color space into the RGB bytes Android accepts.
      const probe = document.createElement("span");
      probe.style.color = "var(--color-sidebar)";
      probe.hidden = true;
      window.document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { colorSpace: "srgb" });
      if (!context) return;
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const rgb = context.getImageData(0, 0, 1, 1).data;
      bridge.setWindowBackground?.(
        `#${Array.from(rgb.slice(0, 3), (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
      );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, accent]);

  return null;
}
