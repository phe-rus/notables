import {
  addDaysTo,
  type Day,
  dayInMonth,
  daysBetween,
  localDay,
  localMoment,
  parseDay,
  weekday,
} from "./day";
import { ALL_DAY_ALERT_HOUR, type CalendarEvent } from "./event";

/** Whether the event happens on this day. */
export function occursOn(event: CalendarEvent, day: Day): boolean {
  if (day < event.date || (event.until && day > event.until)) return false;
  if (event.skipped.includes(day)) return false;
  const start = parseDay(event.date);
  const target = parseDay(day);
  switch (event.repeat) {
    case "never":
      return day === event.date;
    case "daily":
      return true;
    case "weekdays": {
      const dow = weekday(day);
      return dow !== 0 && dow !== 6;
    }
    case "weekly":
      return daysBetween(event.date, day) % 7 === 0;
    case "monthly":
      return day === dayInMonth(target.getUTCFullYear(), target.getUTCMonth(), start.getUTCDate());
    case "yearly":
      return (
        target.getUTCMonth() === start.getUTCMonth() &&
        day === dayInMonth(target.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
      );
  }
}

/** Days from `from` to `to` (both included) the event happens on. */
export function occurrencesBetween(event: CalendarEvent, from: Day, to: Day): Day[] {
  const days: Day[] = [];
  const first = from > event.date ? from : event.date;
  const last = event.until && event.until < to ? event.until : to;
  // Yearly and monthly events need not walk every day.
  if (event.repeat === "yearly" || event.repeat === "monthly") {
    const start = parseDay(event.date);
    const cursor = parseDay(first);
    for (let i = 0; i < 2000; i++) {
      const year = cursor.getUTCFullYear();
      const month = event.repeat === "yearly" ? start.getUTCMonth() : cursor.getUTCMonth();
      const day = dayInMonth(year, month, start.getUTCDate());
      if (day > last) break;
      if (day >= first && !event.skipped.includes(day)) days.push(day);
      if (event.repeat === "yearly") cursor.setUTCFullYear(year + 1, 0, 1);
      else cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
    }
    return days;
  }
  for (let day = first; day <= last; day = addDaysTo(day, 1)) {
    if (occursOn(event, day)) days.push(day);
    if (event.repeat === "never") break;
  }
  return days;
}

/** The first day on or after `from` the event happens, if any. */
export function nextOccurrence(event: CalendarEvent, from: Day, horizonDays = 800): Day | null {
  return occurrencesBetween(event, from, addDaysTo(from, horizonDays))[0] ?? null;
}

/** When an occurrence's alert goes off. */
export function alertMoment(event: CalendarEvent, day: Day): Date | null {
  if (event.alert === null) return null;
  const start = localMoment(day, event.time, ALL_DAY_ALERT_HOUR);
  return new Date(start.getTime() - event.alert * 60_000);
}

export interface DueAlert {
  event: CalendarEvent;
  day: Day;
  at: Date;
}

/**
 * Alerts that go off after `after` and no later than `until`, oldest
 * first. An alert can be up to a few days before its occurrence, so
 * occurrences slightly past `until` are looked at too.
 */
export function alertsBetween(events: CalendarEvent[], after: Date, until: Date): DueAlert[] {
  const pad = (moment: Date, days: number) => addDaysTo(localDay(moment), days);
  const alerts: DueAlert[] = [];
  for (const event of events) {
    if (event.alert === null) continue;
    const lead = Math.ceil(event.alert / 1440) + 1;
    for (const day of occurrencesBetween(event, pad(after, -1), pad(until, lead))) {
      const at = alertMoment(event, day);
      if (at && at > after && at <= until) alerts.push({ event, day, at });
    }
  }
  return alerts.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** How old someone turns on a birthday occurrence, when the birth year is known. */
export function ageOn(event: CalendarEvent, day: Day): number | null {
  if (event.kind !== "birthday") return null;
  const age = Number(day.slice(0, 4)) - Number(event.date.slice(0, 4));
  return age > 0 ? age : null;
}
