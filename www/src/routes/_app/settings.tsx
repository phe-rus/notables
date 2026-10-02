import { createFileRoute } from "@tanstack/react-router";
import { setDrawerOpen } from "../../components/layout/drawer-store";
import { SettingsScreen } from "../../features/settings/components/settings-screen";

export const Route = createFileRoute("/_app/settings")({
  component: () => <SettingsScreen onOpenSidebar={() => setDrawerOpen(true)} />,
});
