import { describe, expect, it } from "bun:test";
import type { CalendarEvent } from "@notables/core";
import { upcomingDates } from "../../../src/features/calendar/lib/upcoming-dates";

const event = (id: string, patch: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  kind: "plan",
  title: id,
  date: "2026-10-22",
  time: null,
  duration: 60,
  repeat: "never",
  until: null,
  alert: null,
  notes: "",
  color: "red",
  skipped: [],
  createdAt: 0,
  updatedAt: 0,
  ...patch,
});

describe("Workspace calendar dates", () => {
  it("groups actual upcoming dates in order instead of counting every stored event", () => {
    const dates = upcomingDates(
      [
        event("past", { date: "2026-10-01" }),
        event("later", { date: "2026-10-26" }),
        event("first"),
        event("second"),
      ],
      "2026-10-22",
    );
    expect(dates.map(({ day }) => day)).toEqual(["2026-10-22", "2026-10-26"]);
    expect(dates[0]?.events.map(({ id }) => id)).toEqual(["first", "second"]);
  });
  it("includes recurring birthdays and ongoing trips, excluding completed and skipped occurrences", () => {
    const dates = upcomingDates(
      [
        event("birthday", { kind: "birthday", date: "1990-10-24", repeat: "yearly" }),
        event("trip", { kind: "trip", date: "2026-10-20", endDate: "2026-10-23" }),
        event("done", { kind: "reminder", done: ["2026-10-22"] }),
        event("skipped", { skipped: ["2026-10-22"] }),
      ],
      "2026-10-22",
    );
    expect(dates.map(({ day, events }) => [day, events.map(({ id }) => id)])).toEqual([
      ["2026-10-22", ["trip"]],
      ["2026-10-24", ["birthday"]],
    ]);
  });
});
