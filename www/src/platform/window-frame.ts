import { devicePlatform } from "./device-platform";
import { isTauri } from "./runtime";

/**
 * Linux windows are undecorated and transparent, so the app draws its own
 * rounded corners. They square off when the window is maximized or full
 * screen, as system windows do. Elsewhere the system rounds windows itself.
 */
export function startWindowFrame(): () => void {
  if (!isTauri() || devicePlatform().os !== "linux") return () => {};
  const root = document.documentElement;
  let stop: (() => void) | undefined;
  let cancelled = false;
  void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
    const window = getCurrentWindow();
    const update = async () => {
      const filled = (await window.isMaximized()) || (await window.isFullscreen());
      root.dataset.windowFrame = filled ? "square" : "rounded";
    };
    await update();
    const unlisten = await window.onResized(() => void update());
    if (cancelled) unlisten();
    else stop = unlisten;
  });
  return () => {
    cancelled = true;
    stop?.();
    delete root.dataset.windowFrame;
  };
}
