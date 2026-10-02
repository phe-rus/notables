import { createRouter } from "@tanstack/react-router";
import { installHaptics } from "./platform/haptics";
import { installServerBridge } from "./platform/server-bridge";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  if (typeof window !== "undefined") {
    installServerBridge();
    installHaptics();
  }
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
