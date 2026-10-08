import { createFileRoute, redirect } from "@tanstack/react-router";
import { setDrawerOpen } from "../../components/layout/drawer-store";
import { isSettingsPageId } from "../../features/settings/components/settings-catalog";
import { SettingsScreen } from "../../features/settings/components/settings-screen";

export const Route = createFileRoute("/_app/settings/$page")({
  // An unknown page (an old link) lands on the Settings list.
  beforeLoad: ({ params }) => {
    if (!isSettingsPageId(params.page)) throw redirect({ to: "/settings" });
  },
  component: SettingsPageRoute,
});

function SettingsPageRoute() {
  const { page } = Route.useParams();
  return (
    <SettingsScreen
      page={isSettingsPageId(page) ? page : null}
      onOpenSidebar={() => setDrawerOpen(true)}
    />
  );
}
