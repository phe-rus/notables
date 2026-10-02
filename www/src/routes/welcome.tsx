import { createFileRoute } from "@tanstack/react-router";
import { SetupFlow } from "../features/setup/components/setup-flow";

export const Route = createFileRoute("/welcome")({
  // Setup reads and writes this device's preferences.
  ssr: false,
  component: SetupFlow,
});
