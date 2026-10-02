import { createFileRoute } from "@tanstack/react-router";
import { setDrawerOpen } from "../../components/layout/drawer-store";
import { ConnectionsScreen } from "../../features/connections/components/connections-screen";

export const Route = createFileRoute("/_app/connections")({
  // Who you share with is known only to this device.
  ssr: false,
  component: ConnectionsRoute,
});

function ConnectionsRoute() {
  return <ConnectionsScreen onOpenSidebar={() => setDrawerOpen(true)} />;
}
