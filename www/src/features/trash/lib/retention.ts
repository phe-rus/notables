/** How long Recently Deleted keeps things before erasing them for good. */
export const RETENTION_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;
const RETENTION = RETENTION_DAYS * DAY;

/** Whole days left before an item is erased; at least 1 until it goes. */
export function daysLeft(trashedAt: number, now = Date.now()): number {
  return Math.max(1, Math.ceil((trashedAt + RETENTION - now) / DAY));
}

export const isExpired = (trashedAt: number, now = Date.now()) => now - trashedAt >= RETENTION;
