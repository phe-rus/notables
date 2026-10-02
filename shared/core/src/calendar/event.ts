/** What an entry on the calendar is for. */
export type CalendarEventKind = "plan" | "birthday" | "reminder";

export type Repeat = "never" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

/**
 * One entry on the calendar. Dates and times are wall-clock values in the
 * person's own time zone, so a 9:00 alarm stays at 9:00 when they travel.
 */
export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  /** First day, YYYY-MM-DD. For a birthday, the date of birth (any year). */
  date: string;
  /** HH:MM, or null for all day. */
  time: string | null;
  /** How long it lasts in minutes; ignored for all-day events. */
  duration: number;
  repeat: Repeat;
  /** Last day it repeats on, YYYY-MM-DD, or null for forever. */
  until: string | null;
  /** Minutes before the start to alert; null for no alert. All-day alerts count from 9:00. */
  alert: number | null;
  notes: string;
  /** Hex colour shown on the calendar. */
  color: string;
  /** Days, YYYY-MM-DD, removed from a repeating event. */
  skipped: string[];
  createdAt: number;
  updatedAt: number;
}

export const calendarKindLabels: Record<CalendarEventKind, string> = {
  plan: "Plan",
  birthday: "Birthday",
  reminder: "Reminder",
};

export const repeatLabels: Record<Repeat, string> = {
  never: "Never",
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};

/** Hour all-day alerts are measured from. */
export const ALL_DAY_ALERT_HOUR = 9;
