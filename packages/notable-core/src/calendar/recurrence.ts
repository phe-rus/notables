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
    case "fortnightly":
      return daysBetween(event.date, day) % 14 === 0;
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

/** How many days after its start an occurrence ends: 0 for one day. */
export function spanDays(event: CalendarEvent): number {
  return event.endDate && event.endDate > event.date ? daysBetween(event.date, event.endDate) : 0;
}

export interface Occurrence {
  event: CalendarEvent;
  /** The day this occurrence starts. */
  start: Day;
  /** The day it ends; the start for a one-day event. */
  end: Day;
}

/**
 * Occurrences that cover any day from `from` to `to`, including ones that
 * began earlier and run into the range, such as a trip.
 */
export function occurrencesTouching(event: CalendarEvent, from: Day, to: Day): Occurrence[] {
  const span = spanDays(event);
  return occurrencesBetween(event, addDaysTo(from, -span), to).map((start) => ({
    event,
    start,
    end: addDaysTo(start, span),
  }));
}

/** Whether a reminder's occurrence on this day has been ticked off. */
export const isDone = (event: CalendarEvent, day: Day): boolean =>
  event.done?.includes(day) ?? false;

/** The first day on or after `from` the event happens, if any. */
export function nextOccurrence(event: CalendarEvent, from: Day, horizonDays = 800): Day | null {
  return occurrencesBetween(event, from, addDaysTo(from, horizonDays))[0] ?? null;
}

/** When an occurrence's alert goes off; `lead` defaults to its first alert. */
export function alertMoment(
  event: CalendarEvent,
  day: Day,
  lead: number | null = event.alert,
): Date | null {
  if (lead === null) return null;
  const start = localMoment(day, event.time, ALL_DAY_ALERT_HOUR);
  return new Date(start.getTime() - lead * 60_000);
}

/** An event's alerts, first then second, without repeats. */
export const alertLeads = (event: CalendarEvent): number[] =>
  [...new Set([event.alert, event.secondAlert ?? null])].filter(
    (lead): lead is number => lead !== null,
  );

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
    const leads = alertLeads(event);
    if (leads.length === 0) continue;
    const ahead = Math.ceil(Math.max(...leads) / 1440) + 1;
    for (const day of occurrencesBetween(event, pad(after, -1), pad(until, ahead))) {
      for (const lead of leads) {
        const at = alertMoment(event, day, lead);
        if (at && at > after && at <= until) alerts.push({ event, day, at });
      }
    }
  }
  return alerts.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** How old someone turns on a birthday occurrence, when the birth year is known. */
export function ageOn(event: CalendarEvent, day: Day): number | null {
  if (event.kind !== "birthday" && event.kind !== "anniversary") return null;
  if (event.yearKnown === false) return null;
  const age = Number(day.slice(0, 4)) - Number(event.date.slice(0, 4));
  return age > 0 ? age : null;
}
