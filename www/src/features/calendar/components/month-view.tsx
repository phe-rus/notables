import {
  addDaysTo,
  type CalendarEvent,
  type Day,
  dayInMonth,
  FIRST_YEAR,
  LAST_YEAR,
  occurrencesTouching,
} from "@notables/core";
import { cn } from "@ultrapeach/ui";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { locale, t } from "../../../i18n/i18n";
import { formatClock } from "../lib/describe-alert";
import { eventTitle } from "../lib/event-display";
import { type Holiday, useHolidays } from "../lib/holidays";
import { monthGrid, weekdayNames } from "../lib/month-grid";
import { byStart } from "./day-agenda";

const MAX_PILLS = 3;
/** Months kept either side of the one in view; more join near the ends. */
const AROUND = 3;
const EDGE = 500;
const FIRST_MONTH = FIRST_YEAR * 12;
const LAST_MONTH = LAST_YEAR * 12 + 11;

/** A month counted from year 0, so months add and subtract as plain numbers. */
const monthIndex = (year: number, month: number) => year * 12 + month;
const yearOf = (index: number) => Math.floor(index / 12);

const monthName = (index: number, withYear: boolean) =>
  new Intl.DateTimeFormat(locale(), {
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${dayInMonth(yearOf(index), index % 12, 1)}T00:00:00Z`));

/**
 * Months one after another, as in Apple's Month view: each starts on its
 * own row under its name, the past above and the future below. Larger
 * screens list what's on each day; phones show a dot per event.
 */
export function MonthView({
  year,
  month,
  today,
  selected,
  weekStart,
  events,
  onDay,
  onZoomIn,
  onVisibleMonth,
}: {
  year: number;
  /** 0-based month to open on. */
  month: number;
  today: Day;
  selected: Day;
  weekStart: number;
  events: CalendarEvent[];
  onDay: (day: Day) => void;
  /** Double-click: into that day's hours. */
  onZoomIn: (day: Day) => void;
  /** The month the scroll has reached, for the title. */
  onVisibleMonth: (year: number, month: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const start = monthIndex(year, month);
  const [range, setRange] = useState(() => ({
    first: Math.max(FIRST_MONTH, start - AROUND),
    last: Math.min(LAST_MONTH, start + AROUND),
  }));
  const before = useRef<number | null>(null);
  const shown = useRef(start);

  // Start on the chosen month.
  useLayoutEffect(() => {
    scroller.current?.querySelector(`[data-month="${start}"]`)?.scrollIntoView({ block: "start" });
  }, []);

  // Months added above keep the view where it was.
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
    if (element.scrollTop < EDGE && range.first > FIRST_MONTH && before.current === null) {
      before.current = element.scrollHeight;
      setRange((r) => ({ ...r, first: Math.max(FIRST_MONTH, r.first - AROUND) }));
    } else if (
      element.scrollHeight - element.scrollTop - element.clientHeight < EDGE &&
      range.last < LAST_MONTH
    ) {
      setRange((r) => ({ ...r, last: Math.min(LAST_MONTH, r.last + AROUND) }));
    }
    const top = element.getBoundingClientRect().top + 60;
    let current = range.first;
    for (const heading of element.querySelectorAll<HTMLElement>("[data-month]")) {
      if (heading.getBoundingClientRect().top <= top) current = Number(heading.dataset.month);
    }
    if (current !== shown.current) {
      shown.current = current;
      onVisibleMonth(yearOf(current), current % 12);
    }
  };

  const from = dayInMonth(yearOf(range.first), range.first % 12, 1);
  const to = dayInMonth(yearOf(range.last), range.last % 12, 31);
  const holidays = useHolidays(from, to);
  const byDay = useMemo(() => {
    const map = new Map<Day, CalendarEvent[]>();
    for (const event of events) {
      for (const occurrence of occurrencesTouching(event, from, to)) {
        for (let on = occurrence.start; on <= occurrence.end; on = addDaysTo(on, 1)) {
          map.set(on, [...(map.get(on) ?? []), event]);
        }
      }
    }
    for (const list of map.values()) list.sort(byStart);
    return map;
  }, [events, from, to]);

  const names = weekdayNames(weekStart);
  const narrow = weekdayNames(weekStart, "narrow");
  const thisYear = Number(today.slice(0, 4));

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="grid grid-cols-7 border-b border-separator/60 px-2 pb-1.5 md:px-4">
        {names.map((name, index) => (
          <span
            key={name}
            className="text-center text-caption2 font-semibold tracking-wide text-label-tertiary uppercase md:text-right md:pr-2"
          >
            <span className="md:hidden">{narrow[index]}</span>
            <span className="hidden md:inline">{name}</span>
          </span>
        ))}
      </div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="min-h-0 grow overflow-y-auto px-2 [overflow-anchor:none] max-md:pb-[calc(env(safe-area-inset-bottom)+96px)] md:px-4 md:pb-4"
      >
        {Array.from({ length: range.last - range.first + 1 }, (_, i) => range.first + i).map(
          (index) => {
            const y = yearOf(index);
            const m = index % 12;
            const weeks = monthGrid(y, m, weekStart).filter((week) =>
              week.some((day) => Number(day.slice(5, 7)) - 1 === m),
            );
            const isThisMonth = today.startsWith(dayInMonth(y, m, 1).slice(0, 7));
            return (
              <section key={index} aria-label={monthName(index, true)} className="pb-2">
                <h2
                  data-month={index}
                  className={cn(
                    "pt-4 pb-1.5 text-title3 font-bold tracking-tight md:text-title2",
                    isThisMonth && "text-accent-text",
                  )}
                >
                  {monthName(index, y !== thisYear)}
                </h2>
                {weeks.map((week) => (
                  <div
                    key={week[0]}
                    className="grid min-h-[52px] grid-cols-7 md:min-h-[92px] md:border-t md:border-separator/60"
                  >
                    {week.map((day) =>
                      Number(day.slice(5, 7)) - 1 === m ? (
                        <DayCell
                          key={day}
                          day={day}
                          outside={false}
                          isToday={day === today}
                          isSelected={day === selected}
                          events={byDay.get(day) ?? []}
                          holidays={holidays.get(day) ?? []}
                          onSelect={() => onDay(day)}
                          onZoomIn={() => onZoomIn(day)}
                        />
                      ) : (
                        <span key={day} />
                      ),
                    )}
                  </div>
                ))}
              </section>
            );
          },
        )}
      </div>
    </div>
  );
}

function DayCell({
  day,
  outside,
  isToday,
  isSelected,
  events,
  holidays,
  onSelect,
  onZoomIn,
}: {
  day: Day;
  outside: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  holidays: Holiday[];
  onSelect: () => void;
  onZoomIn: () => void;
}) {
  const date = Number(day.slice(8));
  const closed = holidays.some((holiday) => holiday.closed);
  const extra = events.length + holidays.length - MAX_PILLS;
  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onZoomIn}
      aria-pressed={isSelected}
      aria-label={`${day}${events.length ? `, ${t("calendar.eventsCount", { count: events.length })}` : ""}`}
      className={cn(
        "group relative flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-xl py-1 text-left transition-colors md:items-stretch md:rounded-lg md:px-1.5 md:py-1.5",
        isSelected ? "md:bg-accent/8" : "hover:bg-fill/50",
        outside && "opacity-40",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center self-center rounded-full text-subheadline tabular-nums transition-colors md:size-7 md:self-end md:text-footnote",
          isToday
            ? "bg-accent font-semibold text-on-accent"
            : isSelected
              ? "bg-inverse font-semibold text-on-inverse md:bg-transparent md:text-accent-text"
              : closed
                ? "text-danger"
                : "text-label",
        )}
      >
        {date}
      </span>

      {/* Phones: a dot per event. */}
      <span className="flex h-1.5 gap-0.5 md:hidden">
        {events.slice(0, 3).map((event) => (
          <span
            key={event.id}
            className="size-1.5 rounded-full"
            style={{ background: event.color }}
          />
        ))}
      </span>

      {/* Larger screens: what's on. */}
      <span className="hidden min-w-0 flex-col gap-0.5 md:flex">
        {holidays.slice(0, MAX_PILLS).map((holiday) => (
          <span
            key={holiday.name}
            className="truncate px-1.5 text-[11.5px] leading-[16px] font-medium text-danger"
          >
            {holiday.name}
          </span>
        ))}
        {events.slice(0, Math.max(0, MAX_PILLS - holidays.length)).map((event) => (
          <span
            key={event.id}
            className="flex min-w-0 items-center gap-1 truncate rounded-xs px-1.5 py-px text-[11.5px] leading-[16px]"
            style={{
              background: `color-mix(in srgb, ${event.color} 16%, transparent)`,
              color: `color-mix(in srgb, ${event.color} 75%, var(--color-label))`,
            }}
          >
            {event.time && (
              <span className="shrink-0 font-medium tabular-nums opacity-80">
                {formatClock(event.time)}
              </span>
            )}
            <span className="truncate font-medium">{eventTitle(event, day)}</span>
          </span>
        ))}
        {extra > 0 && (
          <span className="px-1.5 text-caption2 text-label-tertiary">
            {t("calendar.more", { count: extra })}
          </span>
        )}
      </span>
    </button>
  );
}
