import { locale } from "@/i18n/i18n";

const relative = () => new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });

/** "3 hours ago", "yesterday", "2 weeks ago". */
export function ago(at: number, now = Date.now()): string {
  const minutes = Math.round((at - now) / 60_000);
  if (Math.abs(minutes) < 60) return relative().format(Math.min(-1, minutes), "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative().format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 14) return relative().format(days, "day");
  return relative().format(Math.round(days / 7), "week");
}
