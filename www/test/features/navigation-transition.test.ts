import { expect, test } from "bun:test";
import { navigationTransition } from "@/components/layout/navigation-transition";
import { outerCalendarView } from "@/features/calendar/model/calendar-views";

test("workspace and folders keep navigation direction without animating unchanged views", () => {
  expect(navigationTransition("/", "/", undefined, "folder:one")).toBe("folder-open");
  expect(navigationTransition("/", "/", "folder:one", "workspace")).toBe("folder-close");
  expect(navigationTransition("/", "/", "folder:one", "folder:two")).toBe("place-change");
  expect(navigationTransition("/", "/", "folder:one", "folder:one")).toBeNull();
});

test("place changes and nested screens use distinct motion", () => {
  expect(navigationTransition("/settings", "/settings/privacy")).toBe("page-forward");
  expect(navigationTransition("/settings/privacy", "/settings")).toBe("page-back");
  expect(navigationTransition("/calendar", "/wallet")).toBe("place-change");
  expect(navigationTransition("/calendar", "/calendar")).toBeNull();
});

test("calendar zoom returns through month, year and years", () => {
  expect(outerCalendarView.day).toBe("month");
  expect(outerCalendarView.week).toBe("month");
  expect(outerCalendarView.month).toBe("year");
  expect(outerCalendarView.year).toBe("years");
  expect(outerCalendarView.years).toBeNull();
});
