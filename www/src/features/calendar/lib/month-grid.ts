import { addDaysTo, type Day, dayInMonth, weekday } from "@notables/core";

/** 0 for Sunday through 6 for Saturday, following the person's region. */
export function firstWeekday(): number {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      weekInfo?: { firstDay: number };
      getWeekInfo?: () => { firstDay: number };
    };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay % 7;
  } catch {
    // Older engines: fall through.
  }
  return 1;
}

/** Six rows of seven days covering the month, starting on `weekStart`. */
export function monthGrid(year: number, month: number, weekStart: number): Day[][] {
  const first = dayInMonth(year, month, 1);
  const lead = (weekday(first) - weekStart + 7) % 7;
  const start = addDaysTo(first, -lead);
  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => addDaysTo(start, row * 7 + column)),
  );
}

/** Short weekday names in grid order: "Mon", "Tue"… */
export function weekdayNames(weekStart: number, style: "short" | "narrow" = "short"): string[] {
  const format = new Intl.DateTimeFormat(undefined, { weekday: style, timeZone: "UTC" });
  // 4 January 1970 was a Sunday.
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(1970, 0, 4 + ((weekStart + index) % 7)))),
  );
}
