import { createFileRoute } from "@tanstack/react-router";
import { setDrawerOpen } from "../../components/layout/drawer-store";
import { CalendarScreen } from "../../features/calendar/components/calendar-screen";

const isDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const Route = createFileRoute("/_app/calendar")({
  // Plans live on this device.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { day?: string } => ({
    day: isDay(search.day) ? search.day : undefined,
  }),
  component: CalendarRoute,
});

function CalendarRoute() {
  const { day } = Route.useSearch();
  return <CalendarScreen day={day} onOpenSidebar={() => setDrawerOpen(true)} />;
}
