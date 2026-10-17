import { deployedSite } from "../public-url";
import { isTauri } from "../runtime";

/** The development server, which live mode reaches as localhost (`adb reverse` on a phone). */
const DEV_SERVER = "http://localhost:3000";

/**
 * Where devices meet: the Worker's `/spaces/connect` rooms. A packaged app
 * reaches the deployed site; in development the app's page comes through
 * Tauri's own scheme, which carries no WebSockets, so it goes to the dev
 * server directly. The web uses its own origin, or in development
 * VITE_PUBLIC_URL, so a local browser can link to an installed phone app.
 */
export function roomEndpoint(): string {
  const devWeb = import.meta.env.DEV
    ? (import.meta.env.VITE_PUBLIC_URL as string | undefined)
    : undefined;
  const origin = !isTauri()
    ? (devWeb ?? location.origin)
    : import.meta.env.PROD
      ? deployedSite()
      : DEV_SERVER;
  return `${origin.replace(/^http/, "ws")}/spaces/connect`;
}
