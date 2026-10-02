import { createFileRoute } from "@tanstack/react-router";
import { setDrawerOpen } from "../../components/layout/drawer-store";
import {
  CalendarScreen,
  type CalendarView,
  calendarViews,
} from "../../features/calendar/components/calendar-screen";

const isDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const Route = createFileRoute("/_app/calendar")({
  // Plans live on this device.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { day?: string; view?: CalendarView } => ({
    day: isDay(search.day) ? search.day : undefined,
    view: calendarViews.includes(search.view as CalendarView)
      ? (search.view as CalendarView)
      : undefined,
  }),
  component: CalendarRoute,
});

function CalendarRoute() {
  const { day, view } = Route.useSearch();
  return <CalendarScreen day={day} view={view} onOpenSidebar={() => setDrawerOpen(true)} />;
}
