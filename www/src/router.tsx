import { createRouter } from "@tanstack/react-router";
import { navigationTransition } from "./components/layout/navigation-transition";
import { installHaptics } from "./platform/haptics";
import { installServerBridge } from "./platform/server-bridge";
import { routeTree } from "./routeTree.gen";

function searchView(search: unknown) {
  if (typeof search !== "object" || !search || !("view" in search)) return undefined;
  return typeof search.view === "string" ? search.view : undefined;
}

export function getRouter() {
  if (typeof window !== "undefined") {
    installServerBridge();
    installHaptics();
  }
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) => {
        if (
          typeof window === "undefined" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return false;
        const type = navigationTransition(
          fromLocation?.pathname ?? "/",
          toLocation.pathname,
          searchView(fromLocation?.search),
          searchView(toLocation.search),
        );
        // The live tab capsule owns place changes; a page snapshot would freeze its selection spring.
        return type && type !== "place-change" ? [type] : false;
      },
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
