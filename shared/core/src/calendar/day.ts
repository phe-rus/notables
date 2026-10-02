/**
 * Calendar days as YYYY-MM-DD strings, done in UTC so arithmetic never
 * trips over daylight saving changes.
 */
export type Day = string;

function parts(day: Day): [number, number, number] {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return [year, month, date];
}

/** Years a calendar day can be in: the whole range YYYY-MM-DD can write. */
export const FIRST_YEAR = 1;
export const LAST_YEAR = 9999;

/**
 * A UTC date for any year from 1 to 9999. `Date.UTC` reads years 0 to 99
 * as 1900 to 1999, so the year is set on its own.
 */
function utc(year: number, month: number, date: number): Date {
  const at = new Date(Date.UTC(2000, 0, 1));
  at.setUTCFullYear(year, month, date);
  return at;
}

export function parseDay(day: Day): Date {
  const [year, month, date] = parts(day);
  return utc(year, month - 1, date);
}

export function formatDay(date: Date): Day {
  const year = Math.min(LAST_YEAR, Math.max(FIRST_YEAR, date.getUTCFullYear()));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Today in the local time zone. */
export function localDay(at: Date = new Date()): Day {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(at.getFullYear()).padStart(4, "0")}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function addDaysTo(day: Day, days: number): Day {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDay(date);
}

export function daysBetween(from: Day, to: Day): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

export function daysInMonth(year: number, month: number): number {
  return utc(year, month + 1, 0).getUTCDate();
}

/** Same day of the month, or the month's last day when it is shorter. */
export function dayInMonth(year: number, month: number, date: number): Day {
  const clamped = Math.min(date, daysInMonth(year, month));
  return formatDay(utc(year, month, clamped));
}

/** 0 for Sunday through 6 for Saturday. */
export function weekday(day: Day): number {
  return parseDay(day).getUTCDay();
}

/** The local moment a day and HH:MM time begin. */
export function localMoment(day: Day, time: string | null, fallbackHour = 0): Date {
  const [year, month, date] = parts(day);
  const [hours = 0, minutes = 0] = time ? time.split(":").map(Number) : [fallbackHour, 0];
  const at = new Date(2000, 0, 1, hours, minutes);
  at.setFullYear(year, month - 1, date);
  return at;
}
