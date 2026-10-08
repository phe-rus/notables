import { createFileRoute } from "@tanstack/react-router";
import { WalletScreen } from "../../features/wallet/components/wallet-screen";

export const Route = createFileRoute("/_app/wallet")({ ssr: false, component: WalletScreen });
