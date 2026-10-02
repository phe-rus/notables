import { ageOn, type DueAlert, localDay } from "@notables/core";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "Today", "Tomorrow" or "Friday 3 October". */
export function describeDay(day: string, now = new Date()): string {
  if (day === localDay(now)) return "Today";
  if (day === localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))) {
    return "Tomorrow";
  }
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

/** "9:00 AM" in the person's own clock style. */
export function formatClock(time: string): string {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return timeFormat.format(new Date(2000, 0, 1, hours, minutes));
}

/** "Today at 18:30", "Tomorrow, all day": when something happens. */
export function describeWhen(day: string, time: string | null, now = new Date()): string {
  const date = describeDay(day, now);
  return time ? `${date} at ${formatClock(time)}` : `${date}, all day`;
}

/** The words a notification shows. */
export function describeAlert({ event, day }: DueAlert): { title: string; body: string } {
  const name = event.title.trim() || "Untitled";
  if (event.kind === "birthday") {
    const age = ageOn(event, day);
    return {
      title: `${name}’s birthday`,
      body: age ? `${describeDay(day)}, turning ${age}` : describeDay(day),
    };
  }
  return { title: name, body: event.notes.trim() || describeWhen(day, event.time) };
}
