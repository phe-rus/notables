import type { CalendarView } from "./types";
export const calendarViews: readonly CalendarView[] = ["day", "week", "month", "year", "years"];
export const calendarDepth: Record<CalendarView, number> = {
  years: 0,
  year: 1,
  month: 2,
  week: 3,
  day: 4,
};
export const outerCalendarView: Record<CalendarView, CalendarView | null> = {
  day: "month",
  week: "month",
  month: "year",
  year: "years",
  years: null,
};
