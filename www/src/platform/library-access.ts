import { isTauri } from "./runtime";
import { inBrowserSession } from "./session/browser-session-store";

export const standaloneWeb = import.meta.env.DEV && import.meta.env.VITE_STANDALONE_WEB === "1";
export const ownsLibrary = () => isTauri() || standaloneWeb;
export const canOpenLibrary = () => ownsLibrary() || inBrowserSession();
