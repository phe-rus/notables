import handler from "@tanstack/react-start/server-entry";
import { connectToRoom } from "./server/spaces/space-room";

export { SpaceRoom } from "./server/spaces/space-room";

/**
 * The Worker: the app, plus the rooms where a person's devices and
 * browsers meet (`/spaces/connect`), which pass messages and store nothing.
 */
export default {
  fetch(request: Request, env: Cloudflare.Env) {
    if (new URL(request.url).pathname === "/spaces/connect") {
      return connectToRoom(request, env.SPACE_ROOMS);
    }
    return handler.fetch(request);
  },
};
