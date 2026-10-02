import { describe, expect, it } from "bun:test";
import {
  ageOn,
  alertsBetween,
  type CalendarEvent,
  isDone,
  nextOccurrence,
  occurrencesBetween,
  occurrencesTouching,
  occursOn,
  spanDays,
} from "../../src";

const event = (patch: Partial<CalendarEvent>): CalendarEvent => ({
  id: "e",
  kind: "plan",
  title: "Test",
  date: "2026-01-31",
  time: "09:00",
  duration: 60,
  repeat: "never",
  until: null,
  alert: null,
  notes: "",
  color: "#000",
  skipped: [],
  createdAt: 0,
  updatedAt: 0,
  ...patch,
});

describe("recurrence", () => {
  it("keeps a one-off on its own day", () => {
    const once = event({});
    expect(occursOn(once, "2026-01-31")).toBe(true);
    expect(occurrencesBetween(once, "2026-01-01", "2026-12-31")).toEqual(["2026-01-31"]);
  });

  it("moves monthly events on the 31st to the last day of shorter months", () => {
    const monthly = event({ repeat: "monthly" });
    expect(occurrencesBetween(monthly, "2026-01-01", "2026-04-30")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
    expect(occursOn(monthly, "2026-02-28")).toBe(true);
  });

  it("puts a 29 February birthday on 28 February in other years", () => {
    const birthday = event({ kind: "birthday", date: "2000-02-29", repeat: "yearly", time: null });
    expect(occurrencesBetween(birthday, "2026-01-01", "2028-12-31")).toEqual([
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
    expect(ageOn(birthday, "2026-02-28")).toBe(26);
  });

  it("skips weekends, removed days and days after the end", () => {
    const weekdays = event({
      date: "2026-10-01",
      repeat: "weekdays",
      skipped: ["2026-10-02"],
      until: "2026-10-07",
    });
    expect(occurrencesBetween(weekdays, "2026-09-01", "2026-10-31")).toEqual([
      "2026-10-01",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
  });

  it("finds the next weekly occurrence", () => {
    const weekly = event({ date: "2026-10-01", repeat: "weekly" });
    expect(nextOccurrence(weekly, "2026-10-02")).toBe("2026-10-08");
  });
});

describe("alerts", () => {
  it("fires alerts inside the window, including ones a day ahead", () => {
    const early = event({ date: "2026-10-03", time: "08:00", alert: 1440, title: "Flight" });
    const allDay = event({ date: "2026-10-02", time: null, alert: 0, title: "Bins" });
    const silent = event({ date: "2026-10-02", time: "10:00" });
    const due = alertsBetween(
      [early, allDay, silent],
      new Date(2026, 9, 2, 7, 0),
      new Date(2026, 9, 2, 9, 30),
    );
    expect(due.map((alert) => alert.event.title)).toEqual(["Flight", "Bins"]);
    expect(due[1]?.at).toEqual(new Date(2026, 9, 2, 9, 0));
  });
});

describe("spans and fortnights", () => {
  it("repeats every other week", () => {
    const fortnightly = event({ date: "2026-01-05", repeat: "fortnightly" });
    expect(occurrencesBetween(fortnightly, "2026-01-01", "2026-02-10")).toEqual([
      "2026-01-05",
      "2026-01-19",
      "2026-02-02",
    ]);
  });

  it("finds a trip that started before the range and runs into it", () => {
    const trip = event({ kind: "trip", date: "2026-03-28", endDate: "2026-04-03", time: null });
    expect(spanDays(trip)).toBe(6);
    expect(occurrencesTouching(trip, "2026-04-01", "2026-04-30")).toEqual([
      { event: trip, start: "2026-03-28", end: "2026-04-03" },
    ]);
    expect(occurrencesTouching(trip, "2026-04-04", "2026-04-30")).toEqual([]);
  });

  it("treats an end before the start as a one-day event", () => {
    expect(spanDays(event({ endDate: "2026-01-01" }))).toBe(0);
  });

  it("ticks off one occurrence of a repeating reminder", () => {
    const daily = event({ kind: "reminder", repeat: "daily", done: ["2026-02-01"] });
    expect(isDone(daily, "2026-02-01")).toBe(true);
    expect(isDone(daily, "2026-02-02")).toBe(false);
  });
});

describe("birthdays", () => {
  it("has no age when only the day and month are known", () => {
    const birthday = event({ kind: "birthday", date: "1990-05-04", repeat: "yearly" });
    expect(ageOn(birthday, "2026-05-04")).toBe(36);
    expect(ageOn({ ...birthday, yearKnown: false }, "2026-05-04")).toBeNull();
  });

  it("alerts a week ahead and on the day", () => {
    const birthday = event({
      kind: "birthday",
      date: "1990-05-04",
      time: null,
      repeat: "yearly",
      alert: 0,
      secondAlert: 7 * 1440,
    });
    const due = alertsBetween([birthday], new Date(2026, 3, 20), new Date(2026, 4, 5));
    expect(due.map((alert) => [alert.day, alert.at.getDate()])).toEqual([
      ["2026-05-04", 27],
      ["2026-05-04", 4],
    ]);
  });
});
