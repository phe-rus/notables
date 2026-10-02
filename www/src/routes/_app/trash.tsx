import { createFileRoute } from "@tanstack/react-router";
import { setDrawerOpen } from "../../components/layout/drawer-store";
import { RecentlyDeletedScreen } from "../../features/trash/components/recently-deleted-screen";

export const Route = createFileRoute("/_app/trash")({
  // The bin lives on this device.
  ssr: false,
  component: () => <RecentlyDeletedScreen onOpenSidebar={() => setDrawerOpen(true)} />,
});
