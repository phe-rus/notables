import {
  addDaysTo,
  type CalendarEvent,
  type CalendarEventKind,
  type Day,
  dayInMonth,
  FIRST_YEAR,
  LAST_YEAR,
  localDay,
  occurrencesBetween,
  occurrencesTouching,
  weekday,
} from "@notables/core";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  cn,
  GlobeIcon,
  IconButton,
  openContextMenu,
  PlusIcon,
  Popover,
  SidebarIcon,
  Switch,
  spring,
  useDismiss,
  useMediaQuery,
} from "@notables/ui";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Field, SelectInput } from "../../../components/form/form-fields";
import { CollapsedSidebarControls } from "../../../components/window/collapsed-sidebar-controls";
import { locale, t } from "../../../i18n/i18n";
import { usePreferences } from "../../settings/store/preferences-store";
import {
  holidayCountries,
  setHolidaySettings,
  useHolidaySettings,
  useHolidays,
} from "../lib/holidays";
import { firstWeekday, monthGrid } from "../lib/month-grid";
import { getCalendarStore, useCalendarEvents } from "../store/calendar-store";
import { byStart, DayAgenda } from "./day-agenda";
import type { EventTarget } from "./event-form";
import { EventSheet } from "./event-sheet";
import { MonthView } from "./month-view";
import { TimeGrid } from "./time-grid";
import { YearView } from "./year-view";

export type CalendarView = "day" | "week" | "month" | "year" | "years";
export const calendarViews: readonly CalendarView[] = ["day", "week", "month", "year", "years"];
/** Years on one page of the Years view. */
const YEARS_PAGE = 20;

const clampDay = (day: Day): Day =>
  day < `${String(FIRST_YEAR).padStart(4, "0")}-01-01`
    ? "0001-01-01"
    : day > `${LAST_YEAR}-12-31`
      ? `${LAST_YEAR}-12-31`
      : day;

const format = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(), { ...options, timeZone: "UTC" });
const asDate = (day: Day) => new Date(`${day}T00:00:00Z`);

/**
 * The calendar, after Apple's: a month with the chosen day beside it, a
 * title that zooms out to the year and to every year from 1 to 9999, a
 * double-click that zooms into a day's hours, and holidays from the
 * chosen country.
 */
export function CalendarScreen({
  day: requestedDay,
  view: requestedView,
  onOpenSidebar,
}: {
  day?: Day;
  view?: CalendarView;
  onOpenSidebar: () => void;
}) {
  const events = useCalendarEvents();
  const navigate = useNavigate();
  const { collapsed } = usePreferences().sidebar;
  const phone = useMediaQuery("(max-width: 639px)");
  const [today, setToday] = useState(localDay);
  const selected = requestedDay ?? today;
  const view = requestedView ?? (phone ? "day" : "month");
  const weekStart = useMemo(firstWeekday, []);
  const [target, setTarget] = useState<EventTarget | null>(null);
  // Which way the last change of view went, so the new one grows in or settles back.
  const [zoom, setZoom] = useState<"in" | "out" | null>(null);

  // Keep "today" right across midnight.
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDay()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const depth: Record<CalendarView, number> = { years: 0, year: 1, month: 2, week: 3, day: 4 };
  const zoomTo = (day: Day, next: CalendarView) => {
    setZoom(depth[next] > depth[view] ? "in" : depth[next] < depth[view] ? "out" : null);
    go(day, next);
  };

  const go = useCallback(
    (day: Day, nextView: CalendarView = view) =>
      void navigate({
        to: "/calendar",
        search: { day: day === today ? undefined : clampDay(day), view: nextView },
      }),
    [navigate, today, view],
  );

  const year = Number(selected.slice(0, 4));
  const month = Number(selected.slice(5, 7)) - 1;
  const weekFirst = addDaysTo(selected, -((weekday(selected) - weekStart + 7) % 7));
  const weeks = useMemo(() => monthGrid(year, month, weekStart), [year, month, weekStart]);
  const range: [Day, Day] =
    view === "day"
      ? [selected, selected]
      : view === "week"
        ? [weekFirst, addDaysTo(weekFirst, 6)]
        : view === "month"
          ? [weeks[0]?.[0] ?? selected, weeks.at(-1)?.at(-1) ?? selected]
          : [dayInMonth(year, 0, 1), dayInMonth(year, 11, 31)];
  const holidays = useHolidays(range[0], range[1]);

  const byDay = useMemo(() => {
    const map = new Map<Day, CalendarEvent[]>();
    if (view !== "month") return map;
    for (const event of events) {
      for (const occurrence of occurrencesTouching(event, range[0], range[1])) {
        for (let on = occurrence.start; on <= occurrence.end; on = addDaysTo(on, 1)) {
          map.set(on, [...(map.get(on) ?? []), event]);
        }
      }
    }
    for (const list of map.values()) list.sort(byStart);
    return map;
  }, [events, view, range[0], range[1]]);

  const busy = useMemo(() => {
    const days = new Set<Day>();
    if (view !== "year") return days;
    for (const event of events) {
      for (const on of occurrencesBetween(event, range[0], range[1])) days.add(on);
    }
    return days;
  }, [events, view, range[0], range[1]]);

  const dayEvents = useMemo(
    () =>
      events
        .filter((event) => occurrencesTouching(event, selected, selected).length > 0)
        .sort(byStart),
    [events, selected],
  );

  const shift = (direction: 1 | -1) => {
    if (view === "day") go(addDaysTo(selected, direction));
    else if (view === "week") go(addDaysTo(selected, direction * 7));
    else if (view === "month")
      go(
        dayInMonth(
          year + Math.floor((month + direction) / 12),
          (month + direction + 12) % 12,
          Number(selected.slice(8)),
        ),
      );
    else
      go(
        dayInMonth(
          year + direction * (view === "years" ? YEARS_PAGE : 1),
          month,
          Number(selected.slice(8)),
        ),
      );
  };

  const add = (kind: CalendarEventKind, day: Day = selected, time?: string | null) =>
    setTarget({ event: getCalendarStore().draft(kind, day, time), day, isNew: true });
  const open = (event: CalendarEvent, day: Day) => setTarget({ event, day, isNew: false });

  // Keys as on a Mac: T for today, arrows to page, D W M Y for the views.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "t") go(today);
      else if (event.key === "ArrowLeft") shift(-1);
      else if (event.key === "ArrowRight") shift(1);
      else if (key === "d" || key === "w" || key === "m" || key === "y") {
        go(selected, ({ d: "day", w: "week", m: "month", y: "year" } as const)[key]);
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pageStart = Math.max(FIRST_YEAR, year - ((year - FIRST_YEAR) % YEARS_PAGE));
  const pageEnd = Math.min(LAST_YEAR, pageStart + YEARS_PAGE - 1);
  const title =
    view === "years"
      ? `${pageStart}\u2013${pageEnd}`
      : view === "year"
        ? String(year)
        : view === "day"
          ? format({ day: "numeric", month: "long", year: "numeric" }).format(asDate(selected))
          : format({ month: "long", year: "numeric" }).format(asDate(selected));

  // Apple's way through time: the title zooms out a level, a tap zooms back in.
  const outer: Record<CalendarView, CalendarView | null> = {
    day: "month",
    week: "month",
    month: "year",
    year: "years",
    years: null,
  };

  const agenda = (
    <DayAgenda
      day={selected}
      today={today}
      events={events}
      dayEvents={dayEvents}
      holidays={holidays.get(selected) ?? []}
      onOpen={open}
      onAdd={(kind) => add(kind)}
    />
  );

  return (
    <div className="flex min-h-0 grow flex-col">
      <header
        data-tauri-drag-region
        className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 md:px-5"
      >
        {collapsed && <CollapsedSidebarControls />}
        <div data-tauri-drag-region className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <IconButton label={t("nav.showLibrary")} className="lg:hidden" onClick={onOpenSidebar}>
              <SidebarIcon size={20} />
            </IconButton>
            <ZoomTitle
              title={title}
              year={year}
              zoomOut={outer[view] ? () => zoomTo(selected, outer[view] as CalendarView) : null}
              onYear={(next) => go(dayInMonth(next, month, Number(selected.slice(8))), "year")}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => go(today)}
              disabled={selected === today}
              data-tooltip={t("calendar.goToToday")}
              className="rounded-full px-3 py-1.5 text-[14px] font-medium text-accent-text transition-colors hover:bg-fill/60 disabled:text-label-tertiary disabled:hover:bg-transparent"
            >
              {t("calendar.today")}
            </button>
            <IconButton label={t("calendar.previous")} onClick={() => shift(-1)}>
              <ChevronLeftIcon size={18} className="rtl:-scale-x-100" />
            </IconButton>
            <IconButton label={t("calendar.next")} onClick={() => shift(1)}>
              <ChevronRightIcon size={18} className="rtl:-scale-x-100" />
            </IconButton>
            <HolidayButton />
            <IconButton
              label={t("calendar.newEvent")}
              tone="accent"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                openContextMenu(
                  rect.right - 220,
                  rect.bottom + 6,
                  (
                    ["plan", "reminder", "birthday", "anniversary", "deadline", "trip"] as const
                  ).map((kind) => ({
                    label: t(`calendar.newOf.${kind}`),
                    onSelect: () => add(kind),
                  })),
                );
              }}
            >
              <PlusIcon size={20} strokeWidth={2} />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <motion.div
          key={`${view}:${view === "years" ? pageStart : view === "year" ? year : view === "month" ? selected.slice(0, 7) : weekFirst}`}
          initial={{ opacity: 0, scale: zoom === "in" ? 0.94 : zoom === "out" ? 1.06 : 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.smooth}
          className="flex shrink-0 flex-col md:min-h-0 md:shrink md:grow"
        >
          {view === "years" ? (
            <YearsView
              first={pageStart}
              last={pageEnd}
              current={Number(today.slice(0, 4))}
              selected={year}
              onYear={(next) => zoomTo(dayInMonth(next, month, Number(selected.slice(8))), "year")}
            />
          ) : view === "year" ? (
            <YearView
              year={year}
              today={today}
              weekStart={weekStart}
              busy={busy}
              holidays={holidays}
              onMonth={(m) => zoomTo(dayInMonth(year, m, 1), "month")}
              onDay={(day) => zoomTo(day, "month")}
            />
          ) : view === "month" ? (
            <MonthView
              weeks={weeks}
              month={month}
              today={today}
              selected={selected}
              weekStart={weekStart}
              byDay={byDay}
              holidays={holidays}
              onDay={(day) => go(day)}
              onZoomIn={(day) => zoomTo(day, "day")}
              onSwipe={shift}
            />
          ) : (
            <TimeGrid
              days={
                view === "day"
                  ? [selected]
                  : Array.from({ length: 7 }, (_, i) => addDaysTo(weekFirst, i))
              }
              today={today}
              events={events}
              selectedId={target?.event.id ?? null}
              onCreate={(day, time) => add("plan", day, time)}
              onOpen={open}
              onDayTitle={(day) => zoomTo(day, "day")}
            />
          )}
        </motion.div>
        <aside
          aria-label={t("calendar.day")}
          className="border-t border-separator/60 md:w-[340px] md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l"
        >
          {agenda}
        </aside>
      </div>

      <EventSheet target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

/**
 * The title zooms out a level when tapped: a day to its month, a month to
 * its year, a year to all the years. At the top it takes a typed year.
 */
function ZoomTitle({
  title,
  year,
  zoomOut,
  onYear,
}: {
  title: string;
  year: number;
  zoomOut: (() => void) | null;
  onYear: (year: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(year));
  if (editing) {
    return (
      <input
        // biome-ignore lint/a11y/noAutofocus: opened to type a year
        autoFocus
        aria-label={t("calendar.jumpTo")}
        inputMode="numeric"
        value={text}
        onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 4))}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setEditing(false);
          if (event.key === "Enter") {
            const next = Number(text);
            if (next >= FIRST_YEAR && next <= LAST_YEAR) onYear(next);
            setEditing(false);
          }
        }}
        className="w-[7ch] rounded-[10px] control-field px-2 py-0.5 text-[22px] font-bold tabular-nums"
      />
    );
  }
  return (
    <button
      type="button"
      data-tooltip={zoomOut ? undefined : t("calendar.jumpTo")}
      onClick={() => {
        if (zoomOut) zoomOut();
        else {
          setText(String(year));
          setEditing(true);
        }
      }}
      className="group flex min-w-0 items-center gap-1 rounded-[10px] px-1 text-start text-[22px] font-bold tracking-tight hover:bg-fill/50"
    >
      <span className="truncate">{title}</span>
      <ChevronDownIcon
        size={16}
        strokeWidth={2.4}
        className="shrink-0 rotate-180 text-label-tertiary transition-colors group-hover:text-accent-text"
      />
    </button>
  );
}

/** A page of years, the way out to any century; a year zooms into it. */
function YearsView({
  first,
  last,
  current,
  selected,
  onYear,
}: {
  first: number;
  last: number;
  current: number;
  selected: number;
  onYear: (year: number) => void;
}) {
  return (
    <div className="@container/years min-h-0 grow overflow-y-auto px-4 pb-28 md:pb-8">
      <div className="grid grid-cols-3 gap-2 @min-[480px]/years:grid-cols-4 @min-[760px]/years:grid-cols-5">
        {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onYear(value)}
            className={cn(
              "flex h-16 items-center justify-center rounded-[16px] text-[20px] font-semibold tabular-nums transition-colors",
              value === current
                ? "bg-accent text-on-accent"
                : value === selected
                  ? "bg-inverse text-on-inverse"
                  : "bg-fill/50 hover:bg-fill",
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Which country's holidays show, picked from every country the rules know. */
function HolidayButton() {
  const settings = useHolidaySettings();
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);
  useEffect(() => {
    if (open && countries.length === 0) {
      void holidayCountries(document.documentElement.lang || "en").then(setCountries);
    }
  }, [open, countries.length]);
  return (
    <div ref={root} className="relative">
      <IconButton
        label={t("calendar.holidays")}
        tone={settings.country ? "accent" : "default"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon size={18} />
      </IconButton>
      <Popover
        open={open}
        role="dialog"
        aria-label={t("calendar.holidays")}
        origin="top-right"
        className="top-[calc(100%+8px)] end-0 flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-3 p-4"
      >
        <Field label={t("calendar.holidayCountry")}>
          <SelectInput
            label={t("calendar.holidayCountry")}
            value={settings.country ?? "none"}
            searchable
            onChange={(country) =>
              setHolidaySettings({ country: country === "none" ? null : country })
            }
            options={[
              { value: "none", label: t("calendar.noHolidays") },
              ...(countries.length > 0
                ? countries
                : settings.country
                  ? [{ value: settings.country, label: settings.country }]
                  : []),
            ]}
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px]">{t("calendar.observances")}</span>
          <Switch
            label={t("calendar.observances")}
            checked={settings.observances}
            onChange={(observances) => setHolidaySettings({ observances })}
          />
        </div>
      </Popover>
    </div>
  );
}
