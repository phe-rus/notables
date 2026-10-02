/**
 * Calendar days as YYYY-MM-DD strings, done in UTC so arithmetic never
 * trips over daylight saving changes.
 */
export type Day = string;

function parts(day: Day): [number, number, number] {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return [year, month, date];
}

export function parseDay(day: Day): Date {
  const [year, month, date] = parts(day);
  return new Date(Date.UTC(year, month - 1, date));
}

export function formatDay(date: Date): Day {
  return date.toISOString().slice(0, 10);
}

/** Today in the local time zone. */
export function localDay(at: Date = new Date()): Day {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
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
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Same day of the month, or the month's last day when it is shorter. */
export function dayInMonth(year: number, month: number, date: number): Day {
  const clamped = Math.min(date, daysInMonth(year, month));
  return formatDay(new Date(Date.UTC(year, month, clamped)));
}

/** 0 for Sunday through 6 for Saturday. */
export function weekday(day: Day): number {
  return parseDay(day).getUTCDay();
}

/** The local moment a day and HH:MM time begin. */
export function localMoment(day: Day, time: string | null, fallbackHour = 0): Date {
  const [year, month, date] = parts(day);
  const [hours = 0, minutes = 0] = time ? time.split(":").map(Number) : [fallbackHour, 0];
  return new Date(year, month - 1, date, hours, minutes);
}
