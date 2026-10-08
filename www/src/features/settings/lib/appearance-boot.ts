import { defaultAccent } from "@ultrapeach/tokens";
import { textSizes } from "../model/preferences";
import { PREFERENCES_KEY } from "../store/preferences-store";

interface BootConfig {
  key: string;
  defaultAccent: string;
  bodyPx: Record<string, number>;
  baseBodyPx: number;
}

/**
 * Runs inline before the first paint, so the saved theme, accent, text size
 * and the system's own conventions are in place before anything is drawn.
 * A literal string, not a serialized function: the server and browser
 * bundles format functions differently, which React reports as a hydration
 * mismatch. `config` is the only input. `AppearanceSync` keeps these in step
 * once the app is running.
 */
const script = `
var root = document.documentElement, agent = navigator.userAgent;
root.setAttribute("data-os",
  /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1) ? "ios"
  : /Android/.test(agent) ? "android" : /CrOS/.test(agent) ? "chromeos" : /Mac/.test(agent) ? "macos"
  : /Windows/.test(agent) ? "windows" : /Linux/.test(agent) ? "linux" : "other");
try {
  var saved = JSON.parse(localStorage.getItem(config.key) || "{}");
  if (saved.theme === "light" || saved.theme === "dark") root.setAttribute("data-theme", saved.theme);
  if (typeof saved.accent === "string" && saved.accent !== config.defaultAccent) root.setAttribute("data-accent", saved.accent);
  var body = config.bodyPx[saved.textSize];
  if (body) {
    root.style.setProperty("--nt-body-size", body + "px");
    root.style.setProperty("--type-scale", String(body / config.baseBodyPx));
  }
} catch (error) {}
`;
// The OS test mirrors devicePlatform() in platform/device-platform.ts.

const config: BootConfig = {
  key: PREFERENCES_KEY,
  defaultAccent,
  bodyPx: Object.fromEntries(Object.entries(textSizes).map(([id, size]) => [id, size.bodyPx])),
  baseBodyPx: textSizes.medium.bodyPx,
};

export const appearanceBootScript = `(function (config) {${script}})(${JSON.stringify(config)});`;
