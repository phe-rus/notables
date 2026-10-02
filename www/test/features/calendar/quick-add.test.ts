import { describe, expect, it } from "bun:test";
import { parseQuickEvent } from "../../../src/features/calendar/lib/quick-add";

// A Friday.
const today = "2026-10-02";
const read = (text: string) => parseQuickEvent(text, today);

describe("quick add", () => {
  it("reads a weekday and a time", () => {
    expect(read("Lunch with Ana Monday 1pm")).toMatchObject({
      title: "Lunch with Ana",
      kind: "plan",
      date: "2026-10-05",
      time: "13:00",
      duration: 60,
    });
  });

  it("takes today's weekday as today, and next as the week after", () => {
    expect(read("Gym friday").date).toBe("2026-10-02");
    expect(read("Gym next friday").date).toBe("2026-10-09");
    expect(read("Gym next tuesday").date).toBe("2026-10-06");
  });

  it("reads tomorrow, a length and a reminder", () => {
    expect(read("Remind me to call mum tomorrow at 9:30 for 15 min")).toMatchObject({
      title: "call mum",
      kind: "reminder",
      date: "2026-10-03",
      time: "09:30",
      duration: 15,
    });
  });

  it("guesses afternoon for small hours without am or pm", () => {
    expect(read("Tea at 4").time).toBe("16:00");
    expect(read("Run at 7").time).toBe("07:00");
    expect(read("Standup 14:30").time).toBe("14:30");
  });

  it("reads a range of hours", () => {
    expect(read("Workshop 9-11am Oct 12")).toMatchObject({
      title: "Workshop",
      date: "2026-10-12",
      time: "09:00",
      duration: 120,
    });
  });

  it("rolls a passed date over to next year", () => {
    expect(read("Exam 3 March").date).toBe("2027-03-03");
    expect(read("Exam March 3rd").date).toBe("2027-03-03");
  });

  it("makes a birthday yearly and all day", () => {
    expect(read("Ana's birthday Dec 4")).toMatchObject({
      title: "Ana",
      kind: "birthday",
      date: "2026-12-04",
      time: null,
      repeat: "yearly",
    });
  });

  it("reads repeats", () => {
    expect(read("Piano every tuesday 5pm")).toMatchObject({
      title: "Piano",
      date: "2026-10-06",
      repeat: "weekly",
      time: "17:00",
    });
    expect(read("Bins every 2 weeks").repeat).toBe("fortnightly");
    expect(read("Rent monthly").repeat).toBe("monthly");
  });

  it("makes a trip of several days all day", () => {
    expect(read("Trip to Jinja in 2 weeks for 3 days")).toMatchObject({
      title: "Trip to Jinja",
      kind: "trip",
      date: "2026-10-16",
      time: null,
      endDate: "2026-10-18",
    });
  });

  it("keeps plain text as the title on today", () => {
    expect(read("Water the plants")).toMatchObject({
      title: "Water the plants",
      date: today,
      time: null,
    });
  });
});
