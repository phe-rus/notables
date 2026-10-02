import { ageOn, type DueAlert, localDay } from "@notables/core";
import { locale, t } from "../../../i18n/i18n";

const timeFormat = () => new Intl.DateTimeFormat(locale(), { hour: "numeric", minute: "2-digit" });
const dayFormat = () =>
  new Intl.DateTimeFormat(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

/** "Today", "Tomorrow" or "Friday 3 October". */
export function describeDay(day: string, now = new Date()): string {
  if (day === localDay(now)) return t("dates.today");
  if (day === localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))) {
    return t("calendar.tomorrow");
  }
  return dayFormat().format(new Date(`${day}T00:00:00Z`));
}

/** "9:00 AM" in the person's own clock style. */
export function formatClock(time: string): string {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return timeFormat().format(new Date(2000, 0, 1, hours, minutes));
}

/** "Today at 18:30", "Tomorrow, all day": when something happens. */
export function describeWhen(day: string, time: string | null, now = new Date()): string {
  const date = describeDay(day, now);
  return time
    ? t("calendar.whenAt", { date, time: formatClock(time) })
    : t("calendar.whenAllDay", { date });
}

/** The words a notification shows. */
export function describeAlert({ event, day }: DueAlert): { title: string; body: string } {
  const name = event.title.trim() || t("common.untitled");
  if (event.kind === "birthday") {
    const age = ageOn(event, day);
    return {
      title: t("calendar.birthdayOf", { name }),
      body: age ? t("calendar.dayTurning", { date: describeDay(day), age }) : describeDay(day),
    };
  }
  return { title: name, body: event.notes.trim() || describeWhen(day, event.time) };
}
