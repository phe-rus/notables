import { t } from "../../../i18n/i18n";

export interface AlertChoice {
  value: number | null;
  label: string;
}

/** An alert offset in minutes, in words: "15 minutes before", "1 day before". */
export function alertLabel(minutes: number | null, allDay = false): string {
  if (minutes === null) return t("calendar.alertNone");
  if (minutes === 0) return allDay ? t("calendar.alertOnDay") : t("calendar.alertAtTime");
  if (minutes === 10080) return t("calendar.alertWeek");
  if (minutes % 1440 === 0) return t("calendar.alertDays", { count: minutes / 1440 });
  if (minutes % 60 === 0) return t("calendar.alertHours", { count: minutes / 60 });
  return t("calendar.alertMinutes", { count: minutes });
}

/** Alert offsets in minutes before the start. */
export const timedAlerts = (): AlertChoice[] =>
  [null, 0, 5, 15, 30, 60, 120, 1440].map((value) => ({ value, label: alertLabel(value) }));

/** All-day alerts count back from 9:00 on the day. */
export const allDayAlerts = (): AlertChoice[] =>
  [null, 0, 1440, 2880, 10080].map((value) => ({ value, label: alertLabel(value, true) }));
