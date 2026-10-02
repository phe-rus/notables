import { devicePlatform } from "./device-platform";
import { isTauri } from "./runtime";

/**
 * Linux windows are undecorated and transparent, so the app draws its own
 * rounded corners where the desktop can show them (see window_frame.rs). They square off when the window is maximized or full
 * screen, as system windows do. Elsewhere the system rounds windows itself.
 */
export function startWindowFrame(): () => void {
  if (!isTauri() || devicePlatform().os !== "linux") return () => {};
  const root = document.documentElement;
  let stop: (() => void) | undefined;
  let cancelled = false;
  void Promise.all([import("@tauri-apps/api/core"), import("@tauri-apps/api/window")]).then(
    async ([{ invoke }, { getCurrentWindow }]) => {
      // The app knows whether this desktop can show a transparent window;
      // where it can't (no compositor, ChromeOS), the system frames it.
      const frame = await invoke<string>("window_frame").catch(() => "system");
      if (frame !== "rounded" || cancelled) return;
      const window = getCurrentWindow();
      const update = async () => {
        const filled = (await window.isMaximized()) || (await window.isFullscreen());
        root.dataset.windowFrame = filled ? "square" : "rounded";
      };
      await update();
      const unlisten = await window.onResized(() => void update());
      if (cancelled) unlisten();
      else stop = unlisten;
    },
  );
  return () => {
    cancelled = true;
    stop?.();
    delete root.dataset.windowFrame;
  };
}
