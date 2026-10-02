import { createFileRoute } from "@tanstack/react-router";
import { TodayWidget } from "../features/widgets/components/today-widget";

export const Route = createFileRoute("/widget")({
  // Shows what's on this device.
  ssr: false,
  component: TodayWidget,
});
