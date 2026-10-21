import {
  type CalendarEvent,
  type Day,
  dayInMonth,
  FIRST_YEAR,
  LAST_YEAR,
  occurrencesBetween,
} from "@notables/core";
import { cn } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { locale } from "@/i18n/i18n";
import { useHolidays } from "../lib/holidays";
import { monthGrid, weekdayNames } from "../lib/month-grid";

const monthTitle = (year: number, month: number) =>
  new Intl.DateTimeFormat(locale(), { month: "long", timeZone: "UTC" }).format(
    new Date(`${dayInMonth(year, month, 1)}T00:00:00Z`),
  );

/** Years kept above and below the one in view; more join as the scroll nears an end. */
const AROUND = 1;
const EDGE = 600;

/**
 * Years one after another, as in Apple's Year view: scroll up into the
 * past and down into the future without end, each year's twelve months
 * under its number. Busy days carry a dot, holidays are red; a month
 * zooms into it.
 */
export function YearView({
  year,
  today,
  weekStart,
  events,
  onVisibleYear,
  onMonth,
}: {
  year: number;
  today: Day;
  weekStart: number;
  events: CalendarEvent[];
  /** The year the scroll has reached, for the title. */
  onVisibleYear: (year: number) => void;
  onMonth: (year: number, month: number, anchor: HTMLElement) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState(() => ({
    first: year,
    last: year,
  }));
  // Height before years were added above, so the view doesn't jump.
  const before = useRef<number | null>(null);
  const shown = useRef(year);

  // Build the chosen year first; prepare upward scrolling once the opening settles.
  useEffect(() => {
    const preparePrevious = () => {
      const element = scroller.current;
      const first = element?.querySelector<HTMLElement>("[data-year]");
      if (
        !element ||
        Number(first?.dataset.year) !== year ||
        year === FIRST_YEAR ||
        before.current !== null
      )
        return;
      before.current = element.scrollHeight;
      setRange((current) => ({ ...current, first: year - 1 }));
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preparePrevious, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preparePrevious, 400);
    return () => clearTimeout(id);
  }, [year]);

  // Start on the chosen year.
  useLayoutEffect(() => {
    scroller.current?.querySelector(`[data-year="${year}"]`)?.scrollIntoView({ block: "start" });
  }, []);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && before.current !== null) {
      element.scrollTop += element.scrollHeight - before.current;
      before.current = null;
    }
  }, [range.first]);

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    if (element.scrollTop < EDGE && range.first > FIRST_YEAR && before.current === null) {
      before.current = element.scrollHeight;
      setRange((r) => ({ ...r, first: Math.max(FIRST_YEAR, r.first - AROUND) }));
    } else if (
      element.scrollHeight - element.scrollTop - element.clientHeight < EDGE &&
      range.last < LAST_YEAR
    ) {
      setRange((r) => ({ ...r, last: Math.min(LAST_YEAR, r.last + AROUND) }));
    }
    // The year whose heading last passed the top is the one in view.
    const top = element.getBoundingClientRect().top + 80;
    let current = range.first;
    for (const heading of element.querySelectorAll<HTMLElement>("[data-year]")) {
      if (heading.getBoundingClientRect().top <= top) current = Number(heading.dataset.year);
    }
    if (current !== shown.current) {
      shown.current = current;
      onVisibleYear(current);
    }
  };

  const from = dayInMonth(range.first, 0, 1);
  const to = dayInMonth(range.last, 11, 31);
  const holidays = useHolidays(from, to);
  const busy = useMemo(() => {
    const days = new Set<Day>();
    for (const event of events) for (const on of occurrencesBetween(event, from, to)) days.add(on);
    return days;
  }, [events, from, to]);

  const narrow = weekdayNames(weekStart, "narrow");
  const thisYear = Number(today.slice(0, 4));

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      className="@container/year scroll-surface min-h-0 grow px-4 [overflow-anchor:none]"
    >
      {Array.from({ length: range.last - range.first + 1 }, (_, i) => range.first + i).map(
        (value) => (
          <section key={value} aria-label={String(value)} className="flex flex-col gap-4 pb-10">
            <h2
              data-year={value}
              className={cn(
                "pb-1 text-title font-bold tracking-tight tabular-nums",
                value === thisYear && "text-accent-text",
              )}
            >
              {value}
            </h2>
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 @min-[880px]/year:grid-cols-4">
              {Array.from({ length: 12 }, (_, month) => (
                <Button
                  variant="ghost"
                  key={month}
                  type="button"
                  onClick={(event) => onMonth(value, month, event.currentTarget)}
                  className="h-auto flex flex-col gap-1.5 rounded-xl p-1 text-start [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch transition-colors hover:bg-fill/40"
                >
                  <span
                    className={cn(
                      "text-subheadline font-semibold tracking-tight",
                      today.startsWith(dayInMonth(value, month, 1).slice(0, 7)) &&
                        "text-accent-text",
                    )}
                  >
                    {monthTitle(value, month)}
                  </span>
                  <span className="grid grid-cols-7 text-center text-caption2 font-semibold text-label-tertiary">
                    {narrow.map((name, index) => (
                      <span key={index}>{name}</span>
                    ))}
                  </span>
                  <span className="grid grid-cols-7 gap-y-px">
                    {monthGrid(value, month, weekStart)
                      .flat()
                      .map((day) => {
                        if (Number(day.slice(5, 7)) - 1 !== month) return <span key={day} />;
                        const closed = holidays.get(day)?.some((h) => h.closed);
                        return (
                          <span
                            key={day}
                            className="relative flex aspect-square items-center justify-center text-caption2 tabular-nums"
                          >
                            <span
                              className={cn(
                                "flex size-full max-h-5 max-w-5 items-center justify-center rounded-full",
                                day === today && "bg-accent font-semibold text-on-accent",
                                closed && day !== today && "text-danger",
                              )}
                            >
                              {Number(day.slice(8))}
                            </span>
                            {busy.has(day) && day !== today && (
                              <span className="absolute bottom-0 size-[3px] rounded-full bg-label-tertiary" />
                            )}
                          </span>
                        );
                      })}
                  </span>
                </Button>
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
