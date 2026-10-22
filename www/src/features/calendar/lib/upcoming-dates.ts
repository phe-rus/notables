import {
  addDaysTo,
  type CalendarEvent,
  type Day,
  isDone,
  occurrencesTouching,
} from "@notables/core";
import type { CalendarDatePreview } from "../model/types";

/** Preview actual upcoming days, including recurring and already-started events. */
export function upcomingDates(events: CalendarEvent[], today: Day): CalendarDatePreview[] {
  const days = new Map<Day, CalendarEvent[]>();
  const until = addDaysTo(today, 90);
  for (const event of events) {
    for (const occurrence of occurrencesTouching(event, today, until)) {
      const day = occurrence.start < today ? today : occurrence.start;
      if (event.kind === "reminder" && isDone(event, occurrence.start)) continue;
      const entries = days.get(day) ?? [];
      if (!entries.some((entry) => entry.id === event.id)) entries.push(event);
      days.set(day, entries);
    }
  }
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([day, entries]) => ({ day, events: entries }));
}
