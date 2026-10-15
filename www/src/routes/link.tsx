import { createFileRoute } from "@tanstack/react-router";
import { LinkBrowserScreen } from "../features/devices/components/link-browser-screen";

export const Route = createFileRoute("/link")({
  // Pairing runs in the browser; nothing about it is rendered on the server.
  ssr: false,
  component: LinkBrowserScreen,
});
