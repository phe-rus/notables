/** Alert offsets in minutes before the start, in words. */
export const timedAlerts: Array<{ value: number | null; label: string }> = [
  { value: null, label: "None" },
  { value: 0, label: "At the time" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
];

/** All-day alerts count back from 9:00 on the day. */
export const allDayAlerts: Array<{ value: number | null; label: string }> = [
  { value: null, label: "None" },
  { value: 0, label: "On the day (9:00)" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
  { value: 10080, label: "1 week before" },
];
