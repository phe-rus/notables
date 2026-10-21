import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarYearPreview } from "@/features/calendar/components/calendar-year-preview";

test("year thumbnails show only the year's dates, including leap day", () => {
  const render = (year: number) =>
    renderToStaticMarkup(
      createElement(CalendarYearPreview, { year, today: "2024-02-29", weekStart: 1 }),
    );
  const leap = render(2024);
  const ordinary = render(2025);
  expect(leap.match(/<text /g)?.length).toBe(366 + 12);
  expect(ordinary.match(/<text /g)?.length).toBe(365 + 12);
  expect(leap.match(/<circle /g)?.length).toBe(1);
  expect(ordinary).not.toContain("<circle");
  expect(leap).toContain("data-brand");
  expect(leap).toContain('aria-hidden="true"');
});
