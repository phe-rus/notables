import { createFileRoute, redirect } from "@tanstack/react-router";
import { WalletScreen } from "@/features/wallet/components/wallet-screen";
import { inBrowserSession } from "@/platform/session/browser-session-store";

export const Route = createFileRoute("/_app/wallet")({
  ssr: false,
  // Cards never leave the phone, not even to a browser it serves (spec 0005, AC-28).
  beforeLoad: () => {
    if (inBrowserSession()) throw redirect({ to: "/" });
  },
  component: WalletScreen,
});
