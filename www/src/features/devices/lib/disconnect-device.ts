import { newSecret } from "@notables/sync";
import { adoptSpace } from "../../../platform/space/space-identity";
import { rejoinSpaceSync } from "../../../platform/space/space-sync";
import { endAllBrowserSessions } from "./browser-sessions";

/** Leave the shared space with a new identity, keeping every local document. */
export async function disconnectThisDevice() {
  await adoptSpace(newSecret());
  rejoinSpaceSync();
  endAllBrowserSessions();
}
