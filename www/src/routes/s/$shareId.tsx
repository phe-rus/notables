import { createFileRoute } from "@tanstack/react-router";
import { InvitationScreen } from "../../features/sharing/components/invitation-screen";

export const Route = createFileRoute("/s/$shareId")({
  // The invitation lives in the link's #fragment, which only the browser sees.
  ssr: false,
  component: InvitationRoute,
});

function InvitationRoute() {
  const { shareId } = Route.useParams();
  return <InvitationScreen shareId={shareId} />;
}
