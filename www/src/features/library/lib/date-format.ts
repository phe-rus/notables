const DAY = 24 * 60 * 60 * 1000;

/** Apple Notes style list dates: time today, weekday this week, otherwise a date. */
export function formatUpdated(ms: number, now = Date.now()): string {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (ms >= startOfToday) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(ms);
  }
  if (ms >= startOfToday - DAY) return "Yesterday";
  if (ms >= startOfToday - 6 * DAY) {
    return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(ms);
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(ms);
}

/** "1 October 2026 at 9:41" — shown above a note. */
export function formatFull(ms: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(ms);
}

/** Groups for the notes list. */
export function bucket(ms: number, now = Date.now()): string {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (ms >= startOfToday) return "Today";
  if (ms >= startOfToday - DAY) return "Yesterday";
  if (ms >= startOfToday - 6 * DAY) return "This week";
  if (ms >= startOfToday - 29 * DAY) return "This month";
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(ms);
}

/** Compact age for tight spaces: "now", "5m", "3h", "2d", "4w", then a date. */
export function formatAge(ms: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - ms) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 35) return `${Math.floor(days / 7)}w`;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(ms);
}
