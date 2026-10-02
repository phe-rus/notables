import { addDaysTo, localDay, occurrencesBetween } from "@notables/core";
import { useMemo } from "react";
import { useCalendarEvents } from "./calendar-store";

/** How many things happen today and in the next week, for the sidebar. */
export function useUpcomingCount(days = 7): number {
  const events = useCalendarEvents();
  const today = localDay();
  return useMemo(
    () =>
      events.reduce(
        (total, event) =>
          total + occurrencesBetween(event, today, addDaysTo(today, days - 1)).length,
        0,
      ),
    [events, today, days],
  );
}
