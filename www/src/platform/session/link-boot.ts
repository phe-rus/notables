import { standaloneWeb } from "../library-access";
import { BROWSER_SESSION_KEY } from "./browser-session-store";

/**
 * A browser that never linked a phone goes straight to /link before the app
 * loads, instead of booting the whole app at / and being sent there after.
 * Never inside the apps (their own origins, or Tauri's injected internals).
 */
export const linkBootScript = standaloneWeb
  ? ""
  : `(function(){try{var l=location;if(l.pathname!=="/"||window.__TAURI_INTERNALS__||l.protocol==="tauri:"||l.hostname==="tauri.localhost")return;if(!localStorage.getItem(${JSON.stringify(BROWSER_SESSION_KEY)}))l.replace("/link")}catch(e){}})();`;
